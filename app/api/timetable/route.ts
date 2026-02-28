import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Timetable from '@/models/Timetable';
import { verifyToken, getTokenFromHeader } from '@/lib/auth';

export async function GET(req: NextRequest) {
    try {
        const token = getTokenFromHeader(req.headers.get('authorization') ?? undefined);
        const user = token ? verifyToken(token) : null;
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        await dbConnect();
        const { searchParams } = new URL(req.url);
        const deptId = user.role === 'hod' ? user.departmentId : searchParams.get('departmentId');
        const query: Record<string, unknown> = {};
        if (deptId) query.departmentId = deptId;
        const semester = searchParams.get('semester');
        if (semester) query.semester = parseInt(semester);
        const timetables = await Timetable.find(query)
            .populate('departmentId', 'name code')
            .populate('slots.subjectId', 'subjectName subjectCode')
            .populate('slots.facultyId', 'name email')
            .populate('slots.roomId', 'roomNumber building')
            .sort({ createdAt: -1 });
        return NextResponse.json({ timetables });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    try {
        const token = getTokenFromHeader(req.headers.get('authorization') ?? undefined);
        const user = token ? verifyToken(token) : null;
        if (!user || !['principal', 'hod'].includes(user.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        await dbConnect();
        const { id, ...updates } = await req.json();
        const timetable = await Timetable.findByIdAndUpdate(id, updates, { new: true });
        return NextResponse.json({ timetable });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
