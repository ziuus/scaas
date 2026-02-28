/**
 * Priority Timetable Engine
 * 
 * Same slot-based algorithm as the standard engine, but subjects are
 * pre-sorted by coverage priority (least covered first) and given
 * boosted hoursPerWeek to ensure under-covered topics get more class time.
 * 
 * A priority report is also returned showing what boost each subject got.
 */

export interface PrioritySubjectLoad {
    subjectId: string;
    subjectName: string;
    facultyId: string;
    hoursPerWeek: number;
    baseHours: number;
    coverage: number;  // 0-100 percent covered
}

export interface PrioritySlot {
    day: string;
    startTime: string;
    endTime: string;
    subjectId: string;
    facultyId: string;
    roomId: string;
    section: string;
    semester: number;
}

export interface PriorityReportItem {
    subjectName: string;
    coverage: number;
    baseHours: number;
    scheduledHours: number;
    priority: 'Critical' | 'High' | 'Medium' | 'Low';
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const TIME_SLOTS = [
    { startTime: '09:00', endTime: '10:00' },
    { startTime: '10:00', endTime: '11:00' },
    { startTime: '11:15', endTime: '12:15' },
    { startTime: '12:15', endTime: '13:15' },
    { startTime: '14:00', endTime: '15:00' },
    { startTime: '15:00', endTime: '16:00' },
];

function getPriorityLabel(coverage: number): 'Critical' | 'High' | 'Medium' | 'Low' {
    if (coverage < 25) return 'Critical';
    if (coverage < 50) return 'High';
    if (coverage < 75) return 'Medium';
    return 'Low';
}

export function generatePriorityTimetable(
    subjects: PrioritySubjectLoad[],
    availableRoomIds: string[],
    semester: number,
    section: string,
    departmentHourSubjectId?: string
): { slots: PrioritySlot[]; conflicts: string[]; priorityReport: PriorityReportItem[] } {
    const slots: PrioritySlot[] = [];
    const conflicts: string[] = [];
    const priorityReport: PriorityReportItem[] = [];

    // Track busy states
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

    const isFacultyFree = (fid: string, day: string, timeKey: string) => {
        initFaculty(fid);
        return !facultyBusy[fid][day].has(timeKey);
    };

    const isRoomFree = (rid: string, day: string, timeKey: string) => {
        initRoom(rid);
        return !roomBusy[rid][day].has(timeKey);
    };

    const markFaculty = (fid: string, day: string, timeKey: string) => {
        initFaculty(fid);
        facultyBusy[fid][day].add(timeKey);
    };

    const markRoom = (rid: string, day: string, timeKey: string) => {
        initRoom(rid);
        roomBusy[rid][day].add(timeKey);
    };

    // Subjects are pre-sorted by coverage (least first) by the caller
    for (const subject of subjects) {
        let hoursAssigned = 0;
        const maxAttempts = DAYS.length * TIME_SLOTS.length * Math.max(1, availableRoomIds.length);
        let attempts = 0;

        while (hoursAssigned < subject.hoursPerWeek && attempts < maxAttempts) {
            const day = DAYS[Math.floor(attempts / TIME_SLOTS.length) % DAYS.length];
            const slot = TIME_SLOTS[attempts % TIME_SLOTS.length];
            const timeKey = `${slot.startTime}-${slot.endTime}`;

            if (isFacultyFree(subject.facultyId, day, timeKey)) {
                const freeRoom = availableRoomIds.find(rid => isRoomFree(rid, day, timeKey));
                if (freeRoom) {
                    slots.push({
                        day, startTime: slot.startTime, endTime: slot.endTime,
                        subjectId: subject.subjectId,
                        facultyId: subject.facultyId,
                        roomId: freeRoom,
                        section, semester,
                    });
                    markFaculty(subject.facultyId, day, timeKey);
                    markRoom(freeRoom, day, timeKey);
                    hoursAssigned++;
                }
            }
            attempts++;
        }

        if (hoursAssigned < subject.hoursPerWeek) {
            conflicts.push(`Could only schedule ${hoursAssigned}/${subject.hoursPerWeek} hrs for ${subject.subjectName} (coverage: ${subject.coverage}%)`);
        }

        priorityReport.push({
            subjectName: subject.subjectName,
            coverage: subject.coverage,
            baseHours: subject.baseHours,
            scheduledHours: hoursAssigned,
            priority: getPriorityLabel(subject.coverage),
        });
    }

    // Department Hour: slot where most faculties are busy → assign to least loaded faculty
    if (departmentHourSubjectId) {
        const slotScore: Record<string, Record<string, number>> = {};
        DAYS.forEach(d => {
            slotScore[d] = {};
            TIME_SLOTS.forEach(ts => {
                const timeKey = `${ts.startTime}-${ts.endTime}`;
                let cnt = 0;
                Object.values(facultyBusy).forEach(db => {
                    if (db[d]?.has(timeKey)) cnt++;
                });
                slotScore[d][timeKey] = cnt;
            });
        });

        const classBusy = new Set<string>(slots.map(s => `${s.day}|${s.startTime}`));
        let bestDay = '', bestSlot = TIME_SLOTS[0], bestScore = -1;

        DAYS.forEach(d => {
            TIME_SLOTS.forEach(ts => {
                const timeKey = `${ts.startTime}-${ts.endTime}`;
                if (!classBusy.has(`${d}|${ts.startTime}`) && slotScore[d][timeKey] > bestScore) {
                    bestScore = slotScore[d][timeKey];
                    bestDay = d;
                    bestSlot = ts;
                }
            });
        });

        if (bestDay) {
            const classFacs = Array.from(new Set(subjects.map(s => s.facultyId)));
            let advisorId = classFacs[0];
            let minLoad = 999;
            classFacs.forEach(fid => {
                const load = DAYS.reduce((s, d) => s + (facultyBusy[fid]?.[d]?.size || 0), 0);
                if (load < minLoad) { minLoad = load; advisorId = fid; }
            });
            const timeKey = `${bestSlot.startTime}-${bestSlot.endTime}`;
            const freeRoom = availableRoomIds.find(r => isRoomFree(r, bestDay, timeKey)) || availableRoomIds[0];
            if (advisorId) {
                slots.push({ day: bestDay, startTime: bestSlot.startTime, endTime: bestSlot.endTime, subjectId: departmentHourSubjectId, facultyId: advisorId, roomId: freeRoom, section, semester });
            }
        }
    }

    return { slots, conflicts, priorityReport };
}
