import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Faculty from '@/models/Faculty';
import LeaveRequest from '@/models/LeaveRequest';
import Timetable from '@/models/Timetable';
import Room from '@/models/Room';
import { verifyToken, getTokenFromHeader } from '@/lib/auth';

export async function GET(req: NextRequest) {
    try {
        const token = getTokenFromHeader(req.headers.get('authorization') ?? undefined);
        const user = token ? verifyToken(token) : null;
        if (!user || !['principal', 'hod'].includes(user.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        await dbConnect();

        const [facultyList, leaves, timetables, rooms] = await Promise.all([
            Faculty.find().populate('departmentId', 'name'),
            LeaveRequest.find().populate('facultyId', 'name').populate('departmentId', 'name'),
            Timetable.find(),
            Room.find(),
        ]);

        // Workload analytics
        const workloadData = facultyList.map(f => ({
            name: f.name,
            department: (f.departmentId as unknown as { name?: string })?.name ?? 'N/A',
            currentLoad: f.currentLoad,
            maxLoad: f.maxWeeklyLoad,
            utilizationPct: Math.round((f.currentLoad / f.maxWeeklyLoad) * 100),
            invigilationCount: f.invigilationCount,
        }));

        // Leave analytics
        const leaveByStatus: Record<string, number> = { pending: 0, approved: 0, rejected: 0 };
        leaves.forEach(l => { leaveByStatus[l.status as string]++; });

        const leaveByMonth: Record<string, number> = {};
        leaves.forEach(l => {
            const month = new Date(l.startDate).toLocaleString('default', { month: 'short', year: '2-digit' });
            leaveByMonth[month] = (leaveByMonth[month] || 0) + 1;
        });

        // Room utilization
        const totalSlots = timetables.reduce((acc, tt) => acc + tt.slots.length, 0);
        const roomUtilMap: Record<string, number> = {};
        timetables.forEach(tt => {
            tt.slots.forEach((s: { roomId: { toString(): string } }) => {
                const rid = s.roomId.toString();
                roomUtilMap[rid] = (roomUtilMap[rid] || 0) + 1;
            });
        });
        const roomUtilization = rooms.map(r => ({
            roomNumber: r.roomNumber,
            usageCount: roomUtilMap[r._id.toString()] || 0,
        }));

        // Invigilation distribution
        const invigilationDist = facultyList
            .filter(f => f.invigilationCount > 0)
            .sort((a, b) => b.invigilationCount - a.invigilationCount)
            .slice(0, 10)
            .map(f => ({ name: f.name, count: f.invigilationCount }));

        return NextResponse.json({
            workloadData,
            leaveByStatus,
            leaveByMonth: Object.entries(leaveByMonth).map(([month, count]) => ({ month, count })),
            roomUtilization,
            invigilationDist,
            summary: {
                totalFaculty: facultyList.length,
                totalLeaves: leaves.length,
                totalTimetableSlots: totalSlots,
                totalRooms: rooms.length,
            },
        });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
