import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import LeaveRequest from '@/models/LeaveRequest';
import Timetable from '@/models/Timetable';
import Faculty from '@/models/Faculty';
import { verifyToken, getTokenFromHeader } from '@/lib/auth';

// ── Helper: find best substitute for a given slot ─────────────────────────────
// A substitute is a faculty in the same dept who:
//   a) is NOT on leave that day
//   b) is free (no class) during that slot
//   c) has the least existing workload (fewest slots that day)
async function findSubstitute(
    departmentId: string,
    excludeFacultyId: string,
    dayName: string,
    slotStart: string,
    slotEnd: string,
    leaveDateStart: Date,
    leaveDateEnd: Date
): Promise<{ _id: string; name: string } | null> {
    // All active dept faculty except the one on leave
    const candidates = await Faculty.find({
        departmentId,
        isActive: true,
        _id: { $ne: excludeFacultyId },
    }).lean() as { _id: string; name: string }[];

    if (!candidates.length) return null;

    // Leaves on the same day for other faculty
    const siblingLeaves = (await LeaveRequest.find({
        departmentId,
        facultyId: { $ne: excludeFacultyId },
    }).lean()) as unknown as { facultyId: unknown; leaveType: string; startDate: Date; endDate?: Date; startTime?: string; endTime?: string }[];

    // Timetables for dept
    const timetables = await Timetable.find({ departmentId }).lean() as { slots: { day: string; startTime: string; endTime: string; facultyId: string }[] }[];

    const scoreOf = (fac: { _id: string }) => {
        const facId = fac._id.toString();

        // Is this faculty on leave during this day/slot?
        const onLeave = siblingLeaves.some(l => {
            if (l.facultyId?.toString() !== facId) return false;
            const start = new Date(l.startDate);
            const end = new Date(l.endDate || l.startDate);
            // Check date overlap
            const dateOverlaps = start <= leaveDateEnd && end >= leaveDateStart;
            if (!dateOverlaps) return false;
            if (l.leaveType === 'full_day') return true;
            // partial: check time overlap
            return l.startTime && l.endTime && l.startTime < slotEnd && l.endTime > slotStart;
        });
        if (onLeave) return Infinity;

        // How many slots does this faculty have on this day?
        let dayLoad = 0;
        let isBusyDuringSlot = false;
        timetables.forEach(tt => {
            tt.slots?.forEach((s: { day: string; startTime: string; endTime: string; facultyId: string }) => {
                if (s.facultyId?.toString() !== facId) return;
                if (s.day === dayName) {
                    dayLoad++;
                    if (s.startTime < slotEnd && s.endTime > slotStart) {
                        isBusyDuringSlot = true;
                    }
                }
            });
        });
        if (isBusyDuringSlot) return Infinity;
        return dayLoad; // lowest wins
    };

    const ranked = candidates
        .map(f => ({ f, score: scoreOf(f) }))
        .filter(x => x.score < Infinity)
        .sort((a, b) => a.score - b.score);

    return ranked.length ? ranked[0].f : null;
}

// ── GET: list leaves ─────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
    try {
        const token = getTokenFromHeader(req.headers.get('authorization') ?? undefined);
        const user = token ? verifyToken(token) : null;
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        await dbConnect();

        const query: Record<string, unknown> = {};
        if (user.role === 'faculty') {
            const faculty = await Faculty.findOne({ email: user.email });
            if (faculty) query.facultyId = faculty._id;
        } else if (user.departmentId) {
            query.departmentId = user.departmentId;
        }

        const leaves = await LeaveRequest.find(query)
            .populate('facultyId', 'name email')
            .populate('departmentId', 'name')
            .populate('substituteId', 'name email')
            .sort({ createdAt: -1 })
            .lean();

        return NextResponse.json({ leaves });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

// ── POST: apply leave + auto-substitute ─────────────────────────────────────
export async function POST(req: NextRequest) {
    try {
        const token = getTokenFromHeader(req.headers.get('authorization') ?? undefined);
        const user = token ? verifyToken(token) : null;
        if (!user || user.role !== 'faculty') return NextResponse.json({ error: 'Only faculty can apply leave' }, { status: 403 });
        await dbConnect();

        const faculty = await Faculty.findOne({ email: user.email });
        if (!faculty) return NextResponse.json({ error: 'Faculty profile not found' }, { status: 404 });

        const body = await req.json();
        const { leaveType, startDate, endDate, startTime, endTime, reason } = body;

        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const timetables = await Timetable.find({ departmentId: faculty.departmentId }).lean() as { slots: { day: string; startTime: string; endTime: string; facultyId: string; subjectId: string; roomId: string }[] }[];

        // Collect affected slots and auto-assign a substitute per slot
        const affectedSlots: {
            day: string; startTime: string; endTime: string;
            subjectId: string; roomId: string;
            substituteId?: string; substituteName?: string;
        }[] = [];

        const leaveDateStart = new Date(startDate);
        const leaveDateEnd = new Date(endDate || startDate);

        if (leaveType === 'full_day') {
            for (let d = new Date(leaveDateStart); d <= leaveDateEnd; d.setDate(d.getDate() + 1)) {
                const dayName = days[d.getDay()];
                timetables.forEach(tt => {
                    tt.slots?.forEach(slot => {
                        if (slot.day === dayName && slot.facultyId?.toString() === faculty._id.toString()) {
                            affectedSlots.push({ day: slot.day, startTime: slot.startTime, endTime: slot.endTime, subjectId: slot.subjectId, roomId: slot.roomId });
                        }
                    });
                });
            }
        } else {
            const dayName = days[leaveDateStart.getDay()];
            timetables.forEach(tt => {
                tt.slots?.forEach(slot => {
                    if (slot.day === dayName && slot.facultyId?.toString() === faculty._id.toString()) {
                        if (startTime && endTime && slot.startTime < endTime && slot.endTime > startTime) {
                            affectedSlots.push({ day: slot.day, startTime: slot.startTime, endTime: slot.endTime, subjectId: slot.subjectId, roomId: slot.roomId });
                        }
                    }
                });
            });
        }

        // Auto-substitution: for each affected slot, find a suitable replacement
        let substituteId: string | undefined;
        let substituteName: string | undefined;
        for (const slot of affectedSlots) {
            const sub = await findSubstitute(
                faculty.departmentId.toString(),
                faculty._id.toString(),
                slot.day,
                slot.startTime,
                slot.endTime,
                leaveDateStart,
                leaveDateEnd
            );
            if (sub) {
                slot.substituteId = sub._id.toString();
                slot.substituteName = sub.name;
                // The primary substitute (first slot) is stored at leave level too
                if (!substituteId) { substituteId = sub._id.toString(); substituteName = sub.name; }
            }
        }

        const leave = await LeaveRequest.create({
            facultyId: faculty._id,
            departmentId: faculty.departmentId,
            leaveType,
            startDate: leaveDateStart,
            endDate: leaveDateEnd,
            startTime: leaveType === 'partial' ? startTime : undefined,
            endTime: leaveType === 'partial' ? endTime : undefined,
            reason,
            status: 'applied',   // no pending/approval — just "applied"
            affectedSlots,
            substituteId: substituteId || undefined,
        });

        return NextResponse.json({
            leave,
            autoSubstitute: substituteName
                ? `Auto-assigned: ${substituteName} will substitute.`
                : affectedSlots.length > 0
                    ? 'No available substitute found — HOD will manage.'
                    : 'No classes affected.',
        }, { status: 201 });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'Server error: ' + (err instanceof Error ? err.message : String(err)) }, { status: 500 });
    }
}

// ── DELETE: faculty cancels own leave ────────────────────────────────────────
export async function DELETE(req: NextRequest) {
    try {
        const token = getTokenFromHeader(req.headers.get('authorization') ?? undefined);
        const user = token ? verifyToken(token) : null;
        if (!user || user.role !== 'faculty') return NextResponse.json({ error: 'Only faculty can cancel their own leave' }, { status: 403 });
        await dbConnect();

        const { id } = await req.json();
        const faculty = await Faculty.findOne({ email: user.email });
        const leave = await LeaveRequest.findById(id);
        if (!leave) return NextResponse.json({ error: 'Not found' }, { status: 404 });
        if (!faculty || leave.facultyId.toString() !== faculty._id.toString()) {
            return NextResponse.json({ error: 'You can only cancel your own leave' }, { status: 403 });
        }

        await LeaveRequest.findByIdAndDelete(id);
        return NextResponse.json({ success: true });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
