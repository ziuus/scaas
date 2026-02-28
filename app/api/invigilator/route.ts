import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Faculty from '@/models/Faculty';
import Exam from '@/models/Exam';
import Room from '@/models/Room';
import InvigilatorAllocation from '@/models/InvigilatorAllocation';
import Notification from '@/models/Notification';
import User from '@/models/User';
import { verifyToken, getTokenFromHeader } from '@/lib/auth';
import { allocateInvigilators } from '@/lib/invigilator-engine';

export async function GET(req: NextRequest) {
    try {
        const token = getTokenFromHeader(req.headers.get('authorization') ?? undefined);
        const user = token ? verifyToken(token) : null;
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        await dbConnect();
        const { searchParams } = new URL(req.url);
        const examId = searchParams.get('examId');
        const query: Record<string, unknown> = {};
        if (examId) query.examId = examId;
        const allocations = await InvigilatorAllocation.find(query)
            .populate('examId', 'name examDate startTime endTime')
            .populate('roomId', 'roomNumber building')
            .populate('departmentId', 'name code')
            .populate('primaryInvigilatorId', 'name email')
            .populate('backupInvigilatorId', 'name email');
        return NextResponse.json({ allocations });
    } catch (err) {
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const token = getTokenFromHeader(req.headers.get('authorization') ?? undefined);
        const user = token ? verifyToken(token) : null;
        if (!user || !['principal', 'hod'].includes(user.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        await dbConnect();
        const { examId } = await req.json();
        const exam = await Exam.findById(examId);
        if (!exam) return NextResponse.json({ error: 'Exam not found' }, { status: 404 });

        // Get rooms for this exam (all available exam halls)
        const rooms = await Room.find({ roomType: { $in: ['classroom', 'exam_hall'] }, isAvailable: true });
        // Get departments for rooms
        const allFaculty = await Faculty.find({ isActive: true });

        // Build exam slots (one per room - dept of room determines which faculty can invigilate)
        const examSlots = rooms.map(room => ({
            examId: examId,
            roomId: room._id.toString(),
            departmentId: (room.departmentId ?? exam.departmentId).toString(),
            examDate: exam.examDate.toISOString(),
            startTime: exam.startTime,
            endTime: exam.endTime,
        }));

        const { assignments, unassigned } = allocateInvigilators(
            examSlots,
            allFaculty.map(f => ({
                _id: f._id.toString(),
                name: f.name,
                departmentId: f.departmentId.toString(),
                invigilationCount: f.invigilationCount,
                isActive: f.isActive,
            }))
        );

        // Save allocations and update invigilation counts
        await InvigilatorAllocation.deleteMany({ examId });
        const saved = await InvigilatorAllocation.insertMany(
            assignments.map(a => ({
                examId: a.examId,
                roomId: a.roomId,
                departmentId: a.departmentId,
                primaryInvigilatorId: a.primaryInvigilatorId,
                backupInvigilatorId: a.backupInvigilatorId,
                status: 'auto-assigned',
            }))
        );

        // Update invigilation counts for assigned faculty
        const countMap = new Map<string, number>();
        assignments.forEach(a => {
            countMap.set(a.primaryInvigilatorId, (countMap.get(a.primaryInvigilatorId) || 0) + 1);
            if (a.backupInvigilatorId) countMap.set(a.backupInvigilatorId, (countMap.get(a.backupInvigilatorId) || 0) + 1);
        });
        for (const [facultyId, count] of countMap) {
            await Faculty.findByIdAndUpdate(facultyId, { $inc: { invigilationCount: count } });
            // Notify faculty
            const facultyDoc = await Faculty.findById(facultyId);
            if (facultyDoc) {
                const facultyUser = await User.findOne({ email: facultyDoc.email });
                if (facultyUser) {
                    await Notification.create({
                        userId: facultyUser._id,
                        title: 'Invigilation Duty Assigned',
                        body: `You have been assigned as invigilator for exam: ${exam.name}`,
                        type: 'exam_duty',
                        data: { examId },
                    });
                }
            }
        }

        return NextResponse.json({ allocations: saved, unassigned });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
