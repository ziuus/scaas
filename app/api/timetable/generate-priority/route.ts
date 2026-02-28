import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Faculty from '@/models/Faculty';
import Subject from '@/models/Subject';
import Room from '@/models/Room';
import Timetable from '@/models/Timetable';
import SyllabusCoverage from '@/models/SyllabusCoverage';
import { verifyToken, getTokenFromHeader } from '@/lib/auth';
import { generatePriorityTimetable } from '@/lib/priority-timetable-engine';

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
        const departmentId = body.departmentId || user.departmentId;

        if (!departmentId) {
            return NextResponse.json({ error: 'Department not found' }, { status: 400 });
        }

        // Fetch subjects for this dept+semester
        const subjects = await Subject.find({ departmentId, semester: parseInt(String(semester)) });
        const facultyList = await Faculty.find({ departmentId, isActive: true });
        let rooms = await Room.find({ departmentId, isAvailable: true });
        if (rooms.length === 0) rooms = await Room.find({ isAvailable: true });

        if (subjects.length === 0) return NextResponse.json({ error: 'No subjects found for this semester' }, { status: 400 });
        if (facultyList.length === 0) return NextResponse.json({ error: 'No faculty found' }, { status: 400 });
        if (rooms.length === 0) return NextResponse.json({ error: 'No rooms found' }, { status: 400 });

        // Build a coverage map: subjectId → { coveragePercent, remainingHours, predictedHours }
        const coverageMap: Record<string, { pct: number; remainingHours: number; predicted: number }> = {};
        coverageRecords.forEach(rec => {
            coverageMap[rec.subjectId.toString()] = {
                pct: rec.coveragePercent,
                remainingHours: rec.remainingHours || 0,
                predicted: rec.predictedHoursToFinish || 0,
            };
        });

        // Max remaining hours across all subjects (for normalisation)
        const maxRemaining = Math.max(1, ...Object.values(coverageMap).map(c => c.remainingHours));

        // Build subject loads with faculty assignment (round-robin) + coverage weight
        const subjectLoads = subjects.map((subj, i) => {
            const cov = coverageMap[subj._id.toString()];
            const coverage = cov?.pct ?? 50;
            const remainingHours = cov?.remainingHours ?? 0;

            let priorityMultiplier: number;
            if (remainingHours > 0) {
                // Hours-based: subject with most remaining hours gets the biggest boost
                // e.g. 20h remaining out of 20h max → multiplier 2.0; 5h → 1.25
                priorityMultiplier = 1 + (remainingHours / maxRemaining);
            } else {
                // Fallback: inverse coverage %
                priorityMultiplier = 1 + (100 - coverage) / 100;
            }

            const prioritizedHours = Math.round(subj.hoursPerWeek * priorityMultiplier);
            return {
                subjectId: subj._id.toString(),
                subjectName: subj.subjectName,
                facultyId: facultyList[i % facultyList.length]._id.toString(),
                hoursPerWeek: Math.min(prioritizedHours, 10),
                baseHours: subj.hoursPerWeek,
                coverage,
                remainingHours,
                predictedHours: cov?.predicted ?? 0,
            };
        });

        // Sort: most remaining hours (or least covered) first
        subjectLoads.sort((a, b) =>
            b.remainingHours !== a.remainingHours
                ? b.remainingHours - a.remainingHours  // most hours remaining = highest priority
                : a.coverage - b.coverage               // tie-break by coverage %
        );

        const roomIds = rooms.map(r => r._id.toString());

        // Check if Department Hour subject exists
        const deptHourSubject = await Subject.findOne({
            departmentId,
            subjectName: { $regex: /department (hour|period)/i }
        });

        const { slots, conflicts, priorityReport } = generatePriorityTimetable(
            subjectLoads,
            roomIds,
            parseInt(String(semester)),
            section,
            deptHourSubject?._id?.toString()
        );


        // Save / upsert timetable
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

        return NextResponse.json({ timetable, conflicts, slotsGenerated: slots.length, priorityReport });
    } catch (err) {
        console.error('Priority generate error:', err);
        return NextResponse.json({ error: 'Server error: ' + (err instanceof Error ? err.message : String(err)) }, { status: 500 });
    }
}
