import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Syllabus from '@/models/Syllabus';
import Faculty from '@/models/Faculty';
import { verifyToken, getTokenFromHeader } from '@/lib/auth';
import { GoogleGenerativeAI } from '@google/generative-ai';

// ── Gemini-powered topic extraction ─────────────────────────────────────────
async function extractTopicsWithGemini(raw: string, fileName: string): Promise<{
    topics: { topicName: string; estimatedHours: number; unit: string }[];
    totalHours: number;
    summary: string;
}> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
        throw new Error('GEMINI_API_KEY not configured in .env.local');
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `You are an academic syllabus analyzer. 
I will give you the text content of a syllabus document (filename: "${fileName}").

Your task:
1. Extract ALL topics/subtopics from this syllabus in order
2. Group them under their unit/module if applicable
3. Estimate teaching hours for each topic (based on complexity and any hour mentions)
4. Return ONLY a valid JSON object — no markdown, no explanation, no backticks

JSON format:
{
  "topics": [
    { "topicName": "Introduction to XYZ", "estimatedHours": 2, "unit": "Unit 1: Foundations" },
    { "topicName": "Core Algorithm Design", "estimatedHours": 3, "unit": "Unit 1: Foundations" }
  ],
  "totalHours": 45,
  "summary": "One-line description of what this syllabus covers"
}

Rules:
- topicName: concise, clear, no duplicates, max 120 chars
- estimatedHours: number (0.5–10), use 1.0 as default if unclear
- unit: the module/chapter/unit this topic belongs to, or "" if not organized into units
- totalHours: sum of all estimatedHours (or extract from syllabus if explicitly stated)
- Include ALL topics, subtopics, practicals, case studies
- Do NOT include: page numbers, references, bibliography, instructor info
- Return max 80 topics

Syllabus text:
---
${raw.substring(0, 15000)}
---`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    // Strip markdown code fences if Gemini added them
    const cleaned = text.replace(/^```json?\s*/i, '').replace(/```\s*$/i, '').trim();

    let parsed: { topics: { topicName: string; estimatedHours: number; unit: string }[]; totalHours: number; summary: string };
    try {
        parsed = JSON.parse(cleaned);
    } catch {
        // Try to extract JSON from within the response
        const match = cleaned.match(/\{[\s\S]*\}/);
        if (!match) throw new Error('Gemini returned invalid JSON: ' + cleaned.substring(0, 200));
        parsed = JSON.parse(match[0]);
    }

    if (!Array.isArray(parsed.topics) || parsed.topics.length === 0) {
        throw new Error('Gemini could not find any topics in this document');
    }

    // Sanitize and normalise
    const topics = parsed.topics
        .filter((t) => t.topicName && String(t.topicName).trim().length > 1)
        .map((t) => ({
            topicName: String(t.topicName).trim().substring(0, 120),
            estimatedHours: Math.max(0.5, Math.min(10, Number(t.estimatedHours) || 1)),
            unit: String(t.unit || '').trim(),
        }));

    const totalHours = parsed.totalHours || topics.reduce((s, t) => s + t.estimatedHours, 0);
    return { topics, totalHours, summary: parsed.summary || '' };
}

// ── Raw text extractor (PDF/DOCX/TXT) ───────────────────────────────────────
async function extractRawText(file: File): Promise<string> {
    const fileName = file.name.toLowerCase();
    const buffer = Buffer.from(await file.arrayBuffer());

    if (fileName.endsWith('.pdf')) {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const pdfParse = require('pdf-parse') as (buf: Buffer) => Promise<{ text: string }>;
        const data = await pdfParse(buffer);
        return data.text;
    }

    if (fileName.endsWith('.docx') || fileName.endsWith('.doc')) {
        const mammoth = await import('mammoth');
        const result = await mammoth.extractRawText({ buffer });
        return result.value;
    }

    if (fileName.endsWith('.txt') || fileName.endsWith('.csv')) {
        return buffer.toString('utf-8');
    }

    throw new Error('Unsupported file type. Use PDF, DOCX, or TXT.');
}

// ── POST /api/syllabus/upload ────────────────────────────────────────────────
export async function POST(req: NextRequest) {
    try {
        const token = getTokenFromHeader(req.headers.get('authorization') ?? undefined);
        const user = token ? verifyToken(token) : null;
        if (!user || !['hod', 'principal'].includes(user.role)) {
            return NextResponse.json({ error: 'Only HOD/principal can upload syllabi' }, { status: 403 });
        }
        await dbConnect();

        const formData = await req.formData();
        const file = formData.get('file') as File | null;
        const subjectId = formData.get('subjectId') as string;
        const semester = parseInt(formData.get('semester') as string);
        const section = formData.get('section') as string;
        const academicYear = (formData.get('academicYear') as string) || '2024-25';

        if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        if (!subjectId || !semester || !section) {
            return NextResponse.json({ error: 'subjectId, semester, and section are required' }, { status: 400 });
        }

        // Step 1: Extract raw text from the file
        let rawText: string;
        try {
            rawText = await extractRawText(file);
        } catch (e) {
            return NextResponse.json({ error: String(e instanceof Error ? e.message : e) }, { status: 400 });
        }

        if (!rawText.trim()) {
            return NextResponse.json({ error: 'Could not extract text from the file.' }, { status: 422 });
        }

        // Step 2: Use Gemini to intelligently extract topics
        let extracted: Awaited<ReturnType<typeof extractTopicsWithGemini>>;
        try {
            extracted = await extractTopicsWithGemini(rawText, file.name);
        } catch (e) {
            return NextResponse.json({
                error: 'Gemini analysis failed: ' + (e instanceof Error ? e.message : String(e)),
                hint: 'Make sure GEMINI_API_KEY is set in .env.local',
            }, { status: 500 });
        }

        // Step 3: Normalise and save
        const normTopics = extracted.topics.map((t, i) => ({
            topicNumber: i + 1,
            topicName: t.topicName,
            estimatedHours: t.estimatedHours,
            unit: t.unit,
        }));

        const computedTotalHours = normTopics.reduce((s, t) => s + t.estimatedHours, 0);

        const faculty = await Faculty.findOne({ email: user.email });
        const uploadedBy = faculty?._id ?? user.userId ?? user.email;

        const syllabus = await Syllabus.findOneAndUpdate(
            { subjectId, semester, section },
            {
                departmentId: user.departmentId,
                subjectId,
                semester,
                section,
                topics: normTopics,
                totalEstimatedHours: computedTotalHours,
                uploadedBy,
                academicYear,
            },
            { upsert: true, new: true }
        ).populate('subjectId', 'subjectName subjectCode');

        return NextResponse.json({
            syllabus,
            extracted: normTopics.length,
            totalHours: computedTotalHours,
            summary: extracted.summary,
            preview: normTopics.slice(0, 5).map(t => t.topicName),
        }, { status: 201 });
    } catch (err) {
        console.error('Syllabus upload error:', err);
        return NextResponse.json({
            error: 'Server error: ' + (err instanceof Error ? err.message : String(err))
        }, { status: 500 });
    }
}
