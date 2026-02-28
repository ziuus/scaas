import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Exam from '@/models/Exam';
import Student from '@/models/Student';
import Room from '@/models/Room';
import SeatingAllocation from '@/models/SeatingAllocation';
import { verifyToken, getTokenFromHeader } from '@/lib/auth';
import { allocateSeating } from '@/lib/seating-engine';

export async function GET(req: NextRequest) {
    try {
        const token = getTokenFromHeader(req.headers.get('authorization') ?? undefined);
        const user = token ? verifyToken(token) : null;
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        await dbConnect();
        const exams = await Exam.find()
            .populate('departmentId', 'name code')
            .populate('subjects', 'subjectName subjectCode')
            .sort({ examDate: 1 });
        return NextResponse.json({ exams });
    } catch {
        return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
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
        const body = await req.json();
        const exam = await Exam.create(body);
        return NextResponse.json({ exam }, { status: 201 });
    } catch {
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

// POST /api/exams/allocate-seating
export async function PUT(req: NextRequest) {
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

        const students = await Student.find({ semester: exam.semester });
        const rooms = await Room.find({ roomType: { $in: ['classroom', 'exam_hall'] }, isAvailable: true });

        const { allocations, unallocated } = allocateSeating(
            students.map(s => ({
                _id: s._id.toString(),
                name: s.name,
                rollNumber: s.rollNumber,
                departmentId: s.departmentId.toString(),
                semester: s.semester,
                section: s.section,
            })),
            rooms.map(r => ({
                _id: r._id.toString(),
                roomNumber: r.roomNumber,
                capacity: r.capacity,
                departmentId: r.departmentId?.toString(),
            }))
        );

        // Save seating allocations
        await SeatingAllocation.deleteMany({ examId });
        const saved = await SeatingAllocation.insertMany(
            allocations.map(a => ({
                examId,
                roomId: a.roomId,
                studentAllocations: a.studentAllocations.map(sa => ({
                    studentId: sa.studentId,
                    seatNumber: sa.seatNumber,
                    row: sa.row,
                    col: sa.col,
                })),
                capacity: a.capacity,
                allocated: a.allocated,
            }))
        );

        return NextResponse.json({ allocations: saved, unallocated, totalAllocated: students.length - unallocated.length });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
