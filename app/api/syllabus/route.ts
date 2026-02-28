import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Syllabus from '@/models/Syllabus';
import Faculty from '@/models/Faculty';
import { verifyToken, getTokenFromHeader } from '@/lib/auth';

// GET /api/syllabus?subjectId=&semester=&section=
export async function GET(req: NextRequest) {
    try {
        const token = getTokenFromHeader(req.headers.get('authorization') ?? undefined);
        const user = token ? verifyToken(token) : null;
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        await dbConnect();

        const { searchParams } = new URL(req.url);
        const query: Record<string, unknown> = {};
        if (searchParams.get('subjectId')) query.subjectId = searchParams.get('subjectId');
        if (searchParams.get('semester')) query.semester = parseInt(searchParams.get('semester')!);
        if (searchParams.get('section')) query.section = searchParams.get('section');
        if (user.departmentId) query.departmentId = user.departmentId;

        const syllabi = await Syllabus.find(query)
            .populate('subjectId', 'subjectName subjectCode')
            .populate('uploadedBy', 'name')
            .sort({ updatedAt: -1 });

        return NextResponse.json({ syllabi });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

// POST /api/syllabus — HOD uploads/updates a syllabus
export async function POST(req: NextRequest) {
    try {
        const token = getTokenFromHeader(req.headers.get('authorization') ?? undefined);
        const user = token ? verifyToken(token) : null;
        if (!user || !['hod', 'principal'].includes(user.role)) {
            return NextResponse.json({ error: 'Only HOD/principal can upload syllabi' }, { status: 403 });
        }
        await dbConnect();

        const body = await req.json();
        const { subjectId, semester, section, topics, academicYear } = body;

        if (!subjectId || !semester || !section || !Array.isArray(topics) || topics.length === 0) {
            return NextResponse.json({ error: 'subjectId, semester, section, and topics[] are required' }, { status: 400 });
        }

        // Validate/normalise topics
        const normTopics = topics.map((t: { topicName?: string; estimatedHours?: number; unit?: string }, i: number) => ({
            topicNumber: i + 1,
            topicName: String(t.topicName || '').trim(),
            estimatedHours: Number(t.estimatedHours) || 1,
            unit: t.unit || '',
        })).filter(t => t.topicName);

        if (normTopics.length === 0) {
            return NextResponse.json({ error: 'No valid topics provided' }, { status: 400 });
        }

        const faculty = await Faculty.findOne({ email: user.email });
        const uploadedBy = faculty?._id ?? user.userId ?? user.email;

        const totalEstimatedHours = normTopics.reduce((s, t) => s + t.estimatedHours, 0);

        const syllabus = await Syllabus.findOneAndUpdate(
            { subjectId, semester: parseInt(String(semester)), section },
            {
                departmentId: user.departmentId,
                subjectId,
                semester: parseInt(String(semester)),
                section,
                topics: normTopics,
                totalEstimatedHours,
                uploadedBy,
                academicYear: academicYear || '2024-25',
            },
            { upsert: true, new: true }
        ).populate('subjectId', 'subjectName subjectCode');

        return NextResponse.json({ syllabus }, { status: 201 });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'Server error: ' + (err instanceof Error ? err.message : String(err)) }, { status: 500 });
    }
}

// DELETE /api/syllabus — HOD deletes a syllabus
export async function DELETE(req: NextRequest) {
    try {
        const token = getTokenFromHeader(req.headers.get('authorization') ?? undefined);
        const user = token ? verifyToken(token) : null;
        if (!user || !['hod', 'principal'].includes(user.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        await dbConnect();
        const { id } = await req.json();
        await Syllabus.findByIdAndDelete(id);
        return NextResponse.json({ success: true });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
