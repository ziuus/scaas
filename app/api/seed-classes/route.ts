import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Department from '@/models/Department';
import Subject from '@/models/Subject';
import Faculty from '@/models/Faculty';
import Room from '@/models/Room';
import Timetable from '@/models/Timetable';
import { generateTimetable } from '@/lib/timetable-engine';

export async function GET() {
    try {
        await dbConnect();
        const dept = await Department.findOne({ code: 'CS' });
        if (!dept) return NextResponse.json({ error: 'No CS dept found' }, { status: 404 });

        const facultyList = await Faculty.find({ departmentId: dept._id });
        const rooms = await Room.find({ departmentId: dept._id });

        if (facultyList.length === 0 || rooms.length === 0) {
            return NextResponse.json({ error: 'Missing faculty or rooms in CS dept' }, { status: 400 });
        }

        // 1. Ensure Department Hour subject exists
        let deptHour = await Subject.findOne({ departmentId: dept._id, subjectName: /Department Hour/i });
        if (!deptHour) {
            deptHour = await Subject.create({
                subjectCode: 'DH101',
                subjectName: 'Department Hour',
                semester: 1,
                section: 'ALL',
                subjectType: 'theory',
                hoursPerWeek: 1,
                departmentId: dept._id
            });
        }

        // User requested: s4 cs(ai), s6 cs(ai), s8 cs(ai). We'll add s1 and s2 to make 5.
        const classes = [
            { sem: 1, sec: 'CS(AI)' },
            { sem: 2, sec: 'CS(AI)' },
            { sem: 4, sec: 'CS(AI)' },
            { sem: 6, sec: 'CS(AI)' },
            { sem: 8, sec: 'CS(AI)' },
        ];

        const results = [];

        for (const c of classes) {
            // Ensure some subjects exist for this sem/sec to have valid loads
            const s1 = await Subject.findOneAndUpdate(
                { subjectCode: `CS${c.sem}01`, departmentId: dept._id },
                { subjectName: `Core ${c.sem}.1`, semester: c.sem, section: c.sec, subjectType: 'theory', hoursPerWeek: 5 },
                { upsert: true, new: true }
            );
            const s2 = await Subject.findOneAndUpdate(
                { subjectCode: `CS${c.sem}02`, departmentId: dept._id },
                { subjectName: `Core ${c.sem}.2`, semester: c.sem, section: c.sec, subjectType: 'theory', hoursPerWeek: 4 },
                { upsert: true, new: true }
            );

            const subjects = [s1, s2];
            const subjectLoads = subjects.map((subj, i) => ({
                subjectId: subj._id.toString(),
                subjectName: subj.subjectName,
                facultyId: facultyList[i % facultyList.length]._id.toString(),
                hoursPerWeek: subj.hoursPerWeek,
            }));

            const roomIds = rooms.map(r => r._id.toString());
            const { slots, conflicts } = generateTimetable(subjectLoads, roomIds, c.sem, c.sec, deptHour._id.toString());

            const timetableData = {
                departmentId: dept._id,
                academicYear: '2024-25',
                semester: c.sem,
                section: c.sec,
                slots: slots.map(s => ({
                    day: s.day,
                    startTime: s.startTime,
                    endTime: s.endTime,
                    subjectId: s.subjectId,
                    facultyId: s.facultyId,
                    roomId: s.roomId,
                    section: c.sec,
                    semester: c.sem,
                })),
                isApproved: false,
                generatedAt: new Date(),
            };

            await Timetable.findOneAndReplace(
                { departmentId: dept._id, semester: c.sem, section: c.sec },
                timetableData,
                { upsert: true }
            );

            results.push({ sem: c.sem, sec: c.sec, slots: slots.length, conflicts });
        }

        return NextResponse.json({ success: true, results });
    } catch (err) {
        return NextResponse.json({ error: (err as Error).message }, { status: 500 });
    }
}
