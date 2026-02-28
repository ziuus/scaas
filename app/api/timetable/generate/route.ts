import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Faculty from '@/models/Faculty';
import Subject from '@/models/Subject';
import Room from '@/models/Room';
import Timetable from '@/models/Timetable';
import { verifyToken, getTokenFromHeader } from '@/lib/auth';
import { generateTimetable } from '@/lib/timetable-engine';

export async function POST(req: NextRequest) {
    try {
        const token = getTokenFromHeader(req.headers.get('authorization') ?? undefined);
        const user = token ? verifyToken(token) : null;
        if (!user || !['principal', 'hod'].includes(user.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        await dbConnect();
        const body = await req.json();
        const { semester, section, academicYear } = body;

        // HOD uses their own department from the token; principal can specify
        const departmentId = body.departmentId || user.departmentId;

        if (!departmentId) {
            return NextResponse.json({ error: 'Department not found. Please ensure your account is linked to a department.' }, { status: 400 });
        }

        // Fetch subjects for this dept/semester
        const subjects = await Subject.find({ departmentId, semester: parseInt(String(semester)) });
        // Fetch active faculty for this dept
        const faculty = await Faculty.find({ departmentId, isActive: true });
        // Fetch available rooms in the same department (or any available room as fallback)
        let rooms = await Room.find({ departmentId, isAvailable: true, roomType: { $in: ['classroom', 'lab'] } });
        if (rooms.length === 0) {
            rooms = await Room.find({ isAvailable: true, roomType: { $in: ['classroom', 'lab'] } });
        }

        if (subjects.length === 0) {
            return NextResponse.json({ error: 'No subjects found for this department and semester. Please add subjects first.' }, { status: 400 });
        }

        if (faculty.length === 0) {
            return NextResponse.json({ error: 'No faculty members found for this department. Please add faculty first.' }, { status: 400 });
        }

        if (rooms.length === 0) {
            return NextResponse.json({ error: 'No available rooms found. Please add rooms first.' }, { status: 400 });
        }

        // Create subject load array (assign faculty round-robin if no specific mapping)
        const subjectLoads = subjects.map((subj, i) => ({
            subjectId: subj._id.toString(),
            subjectName: subj.subjectName,
            facultyId: faculty[i % faculty.length]._id.toString(),
            hoursPerWeek: subj.hoursPerWeek,
        }));

        const roomIds = rooms.map(r => r._id.toString());
        const deptHourSubject = await Subject.findOne({ departmentId, subjectName: { $regex: /department (hour|period)/i } });

        const { slots, conflicts } = generateTimetable(subjectLoads, roomIds, parseInt(String(semester)), section, deptHourSubject?._id?.toString());

        // Save timetable (upsert)
        const timetableData = {
            departmentId,
            academicYear: academicYear || '2024-25',
            semester: parseInt(String(semester)),
            section,
            slots: slots.map(s => ({
                day: s.day,
                startTime: s.startTime,
                endTime: s.endTime,
                subjectId: s.subjectId,
                facultyId: s.facultyId,
                roomId: s.roomId,
                section,
                semester: parseInt(String(semester)),
            })),
            isApproved: false,
            generatedAt: new Date(),
        };

        const timetable = await Timetable.findOneAndReplace(
            { departmentId, semester: parseInt(String(semester)), section },
            timetableData,
            { upsert: true, new: true }
        ).populate('departmentId', 'name');

        return NextResponse.json({ timetable, conflicts, slotsGenerated: slots.length });
    } catch (err) {
        console.error('Timetable generate error:', err);
        return NextResponse.json({ error: 'Server error: ' + (err instanceof Error ? err.message : String(err)) }, { status: 500 });
    }
}
