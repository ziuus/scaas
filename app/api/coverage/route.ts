import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import SyllabusCoverage from '@/models/SyllabusCoverage';
import Syllabus from '@/models/Syllabus';
import Faculty from '@/models/Faculty';
import Subject from '@/models/Subject';
import { verifyToken, getTokenFromHeader } from '@/lib/auth';

// ── Smart topic fuzzy match ───────────────────────────────────────────────────
// Returns the best-matching topic index from the syllabus given a faculty's
// free-text description like "Sorting algorithms" or topic number like "5"
function matchTopic(syllabusTopics: { topicName: string }[], query: string): number {
    const q = query.toLowerCase().trim();

    // Try exact topic number first
    const num = parseInt(q);
    if (!isNaN(num) && num >= 1 && num <= syllabusTopics.length) {
        return num - 1;
    }

    // Exact name match
    const exact = syllabusTopics.findIndex(t => t.topicName.toLowerCase() === q);
    if (exact !== -1) return exact;

    // Partial / includes match
    const partial = syllabusTopics.findIndex(t => t.topicName.toLowerCase().includes(q) || q.includes(t.topicName.toLowerCase()));
    if (partial !== -1) return partial;

    // Word-overlap score (simple bag-of-words)
    const qWords = new Set(q.split(/\s+/).filter(w => w.length > 2));
    let best = -1, bestScore = 0;
    syllabusTopics.forEach((t, i) => {
        const tWords = t.topicName.toLowerCase().split(/\s+/);
        const overlap = tWords.filter(w => qWords.has(w)).length;
        if (overlap > bestScore) { bestScore = overlap; best = i; }
    });
    if (best !== -1 && bestScore > 0) return best;

    return -1; // no match
}

// ── GET coverage records ─────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
    try {
        const token = getTokenFromHeader(req.headers.get('authorization') ?? undefined);
        const user = token ? verifyToken(token) : null;
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        await dbConnect();

        const { searchParams } = new URL(req.url);
        const query: Record<string, unknown> = {};

        if (user.role === 'faculty') {
            const faculty = await Faculty.findOne({ email: user.email });
            if (faculty) query.facultyId = faculty._id;
        } else {
            if (user.departmentId) query.departmentId = user.departmentId;
            if (searchParams.get('semester')) query.semester = parseInt(searchParams.get('semester')!);
            if (searchParams.get('section')) query.section = searchParams.get('section');
            if (searchParams.get('subjectId')) query.subjectId = searchParams.get('subjectId');
        }

        const records = await SyllabusCoverage.find(query)
            .populate('facultyId', 'name email')
            .populate('subjectId', 'subjectName subjectCode hoursPerWeek')
            .populate('syllabusId', 'topics totalEstimatedHours')
            .sort({ coveragePercent: 1 });

        return NextResponse.json({ records });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

// ── POST: Faculty updates progress (last topic taught) ───────────────────────
export async function POST(req: NextRequest) {
    try {
        const token = getTokenFromHeader(req.headers.get('authorization') ?? undefined);
        const user = token ? verifyToken(token) : null;
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        await dbConnect();

        const faculty = await Faculty.findOne({ email: user.email });
        if (!faculty) return NextResponse.json({ error: 'Faculty profile not found' }, { status: 404 });

        const body = await req.json();
        const { subjectId, semester, section, lastTaughtTopic, notes } = body;

        // Find the syllabus for this subject+semester+section
        const syllabus = await Syllabus.findOne({
            subjectId,
            semester: parseInt(String(semester)),
            section,
        });

        const subject = await Subject.findById(subjectId);

        let updateData: Record<string, unknown>;

        if (syllabus && syllabus.topics.length > 0) {
            // SYLLABUS-AWARE mode: match topic, compute hours
            const matchedIndex = typeof lastTaughtTopic === 'number'
                ? lastTaughtTopic                        // direct index passed
                : matchTopic(syllabus.topics, String(lastTaughtTopic));

            const safeIndex = Math.max(-1, Math.min(matchedIndex, syllabus.topics.length - 1));
            const coveredTopics = safeIndex + 1;
            const coveredHours = syllabus.topics
                .slice(0, coveredTopics)
                .reduce((s, t) => s + t.estimatedHours, 0);
            const remainingHours = syllabus.topics
                .slice(coveredTopics)
                .reduce((s, t) => s + t.estimatedHours, 0);
            const totalHours = syllabus.totalEstimatedHours || syllabus.topics.reduce((s, t) => s + t.estimatedHours, 0);
            const coveragePercent = totalHours > 0 ? Math.round((coveredHours / totalHours) * 100) : 0;

            updateData = {
                facultyId: faculty._id,
                subjectId,
                syllabusId: syllabus._id,
                departmentId: faculty.departmentId,
                semester: parseInt(String(semester)),
                section,
                lastTaughtTopicIndex: safeIndex,
                lastTaughtTopicName: safeIndex >= 0 ? syllabus.topics[safeIndex]?.topicName : '',
                coveredTopics,
                totalTopics: syllabus.topics.length,
                coveredHours,
                remainingHours,
                totalEstimatedHours: totalHours,
                coveragePercent,
                predictedHoursToFinish: remainingHours,
                notes,
            };
        } else {
            // FALLBACK mode (no syllabus uploaded): simple count-based
            const { totalTopics = 0, coveredTopics: manualCovered = 0 } = body;
            const pct = totalTopics > 0 ? Math.round((manualCovered / totalTopics) * 100) : 0;
            updateData = {
                facultyId: faculty._id,
                subjectId,
                departmentId: faculty.departmentId,
                semester: parseInt(String(semester)),
                section,
                lastTaughtTopicIndex: manualCovered - 1,
                lastTaughtTopicName: manualCovered > 0 ? `Topic ${manualCovered}` : '',
                coveredTopics: manualCovered,
                totalTopics,
                coveredHours: 0,
                remainingHours: 0,
                totalEstimatedHours: 0,
                coveragePercent: pct,
                predictedHoursToFinish: 0,
                notes,
            };
        }

        const record = await SyllabusCoverage.findOneAndUpdate(
            { facultyId: faculty._id, subjectId, section },
            updateData,
            { upsert: true, new: true }
        )
            .populate('subjectId', 'subjectName subjectCode hoursPerWeek')
            .populate('syllabusId', 'topics totalEstimatedHours')
            .populate('facultyId', 'name email');

        return NextResponse.json({
            record,
            matched: syllabus
                ? `Matched: Topic ${(record.lastTaughtTopicIndex + 1)} — "${record.lastTaughtTopicName}"`
                : 'No syllabus uploaded — saved manual count',
        }, { status: 201 });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'Server error: ' + (err instanceof Error ? err.message : String(err)) }, { status: 500 });
    }
}
