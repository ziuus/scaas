/**
 * Timetable Generation Engine
 * Constraint-based algorithm that auto-generates conflict-free timetables.
 * Constraints: faculty availability, room availability, hours-per-week, no time overlaps.
 */

export interface SubjectLoad {
    subjectId: string;
    subjectName: string;
    facultyId: string;
    hoursPerWeek: number;
}

export interface SlotTemplate {
    day: string;
    startTime: string;
    endTime: string;
}

export interface GeneratedSlot extends SlotTemplate {
    subjectId: string;
    facultyId: string;
    roomId: string;
    section: string;
    semester: number;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const TIME_SLOTS: SlotTemplate[] = [
    { day: '', startTime: '09:00', endTime: '10:00' },
    { day: '', startTime: '10:00', endTime: '11:00' },
    { day: '', startTime: '11:15', endTime: '12:15' },
    { day: '', startTime: '12:15', endTime: '13:15' },
    { day: '', startTime: '14:00', endTime: '15:00' },
    { day: '', startTime: '15:00', endTime: '16:00' },
];

export function generateTimetable(
    subjects: SubjectLoad[],
    availableRoomIds: string[],
    semester: number,
    section: string,
    departmentHourSubjectId?: string
): { slots: GeneratedSlot[]; conflicts: string[] } {
    const slots: GeneratedSlot[] = [];
    const conflicts: string[] = [];

    // Track usage: facultyBusy[facultyId][day][time] and roomBusy[roomId][day][time]
    const facultyBusy: Record<string, Record<string, Set<string>>> = {};
    const roomBusy: Record<string, Record<string, Set<string>>> = {};

    const initFaculty = (fid: string) => {
        if (!facultyBusy[fid]) {
            facultyBusy[fid] = {};
            DAYS.forEach(d => { facultyBusy[fid][d] = new Set(); });
        }
    };

    const initRoom = (rid: string) => {
        if (!roomBusy[rid]) {
            roomBusy[rid] = {};
            DAYS.forEach(d => { roomBusy[rid][d] = new Set(); });
        }
    };

    const isFacultyFree = (fid: string, day: string, time: string) => {
        initFaculty(fid);
        return !facultyBusy[fid][day].has(time);
    };

    const isRoomFree = (rid: string, day: string, time: string) => {
        initRoom(rid);
        return !roomBusy[rid][day].has(time);
    };

    const markFaculty = (fid: string, day: string, time: string) => {
        initFaculty(fid);
        facultyBusy[fid][day].add(time);
    };

    const markRoom = (rid: string, day: string, time: string) => {
        initRoom(rid);
        roomBusy[rid][day].add(time);
    };

    for (const subject of subjects) {
        let hoursAssigned = 0;
        let attempts = 0;
        const maxAttempts = DAYS.length * TIME_SLOTS.length * availableRoomIds.length;

        while (hoursAssigned < subject.hoursPerWeek && attempts < maxAttempts) {
            const day = DAYS[Math.floor(attempts / TIME_SLOTS.length) % DAYS.length];
            const slot = TIME_SLOTS[attempts % TIME_SLOTS.length];
            const timeKey = `${slot.startTime}-${slot.endTime}`;

            if (isFacultyFree(subject.facultyId, day, timeKey)) {
                // Find a free room
                const freeRoom = availableRoomIds.find(rid => isRoomFree(rid, day, timeKey));
                if (freeRoom) {
                    slots.push({
                        day,
                        startTime: slot.startTime,
                        endTime: slot.endTime,
                        subjectId: subject.subjectId,
                        facultyId: subject.facultyId,
                        roomId: freeRoom,
                        section,
                        semester,
                    });
                    markFaculty(subject.facultyId, day, timeKey);
                    markRoom(freeRoom, day, timeKey);
                    hoursAssigned++;
                }
            }
            attempts++;
        }

        if (hoursAssigned < subject.hoursPerWeek) {
            conflicts.push(`Could only assign ${hoursAssigned}/${subject.hoursPerWeek} hours for subject: ${subject.subjectName}`);
        }
    }

    // --- Department Hour Logic ---
    // Make period for department hour based on the heavy workload of faculties.
    if (departmentHourSubjectId) {
        const slotBusyScore: Record<string, Record<string, number>> = {};
        DAYS.forEach(d => {
            slotBusyScore[d] = {};
            TIME_SLOTS.forEach(ts => {
                const timeKey = `${ts.startTime}-${ts.endTime}`;
                let busyCount = 0;
                Object.values(facultyBusy).forEach(days => {
                    if (days[d] && days[d].has(timeKey)) busyCount++;
                });
                slotBusyScore[d][timeKey] = busyCount;
            });
        });

        const classBusySlots = new Set<string>();
        slots.filter(s => s.section === section && s.semester === semester).forEach(s => {
            classBusySlots.add(`${s.day}|${s.startTime}-${s.endTime}`);
        });

        let bestDay = '';
        let bestTimeKey = '';
        let bestSlotTemplate: SlotTemplate | null = null;
        let maxBusyCount = -1;

        for (const d of DAYS) {
            for (const ts of TIME_SLOTS) {
                const timeKey = `${ts.startTime}-${ts.endTime}`;
                if (!classBusySlots.has(`${d}|${timeKey}`)) {
                    if (slotBusyScore[d][timeKey] > maxBusyCount) {
                        maxBusyCount = slotBusyScore[d][timeKey];
                        bestDay = d;
                        bestTimeKey = timeKey;
                        bestSlotTemplate = ts;
                    }
                }
            }
        }

        if (bestDay && bestSlotTemplate) {
            const classFaculties = Array.from(new Set(subjects.map(s => s.facultyId)));
            let advisorId = classFaculties[0];
            let minLoad = 999;
            classFaculties.forEach(fid => {
                let load = 0;
                DAYS.forEach(d => { load += facultyBusy[fid]?.[d]?.size || 0; });
                if (load < minLoad) {
                    minLoad = load;
                    advisorId = fid;
                }
            });

            if (advisorId) {
                const freeRoom = availableRoomIds.find(rid => isRoomFree(rid, bestDay, bestTimeKey)) || availableRoomIds[0];
                slots.push({
                    day: bestDay,
                    startTime: bestSlotTemplate.startTime,
                    endTime: bestSlotTemplate.endTime,
                    subjectId: departmentHourSubjectId,
                    facultyId: advisorId,
                    roomId: freeRoom,
                    section,
                    semester,
                });
                markFaculty(advisorId, bestDay, bestTimeKey);
                if (freeRoom) markRoom(freeRoom, bestDay, bestTimeKey);
            }
        }
    }

    return { slots, conflicts };
}

export function detectConflicts(slots: GeneratedSlot[]): string[] {
    const issues: string[] = [];
    const map = new Map<string, GeneratedSlot[]>();

    for (const slot of slots) {
        const fKey = `faculty:${slot.facultyId}:${slot.day}:${slot.startTime}`;
        const rKey = `room:${slot.roomId}:${slot.day}:${slot.startTime}`;
        map.set(fKey, [...(map.get(fKey) || []), slot]);
        map.set(rKey, [...(map.get(rKey) || []), slot]);
    }

    map.forEach((items, key) => {
        if (items.length > 1) {
            issues.push(`CONFLICT: ${key} has ${items.length} overlapping assignments`);
        }
    });

    return issues;
}
