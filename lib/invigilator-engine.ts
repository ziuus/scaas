/**
 * Invigilator Allocation Engine
 * Department-based assignment: only faculty from the same department as the exam hall.
 * Sorts by least invigilation count for fair distribution. Optionally assigns backup.
 */

export interface FacultyCandidate {
    _id: string;
    name: string;
    departmentId: string;
    invigilationCount: number;
    isActive: boolean;
}

export interface ExamSlot {
    examId: string;
    roomId: string;
    departmentId: string; // department that owns the room
    examDate: string;
    startTime: string;
    endTime: string;
}

export interface AlreadyAllocated {
    examId: string;
    facultyId: string;
}

export interface InvigilatorAssignment {
    examId: string;
    roomId: string;
    departmentId: string;
    primaryInvigilatorId: string;
    backupInvigilatorId?: string;
    status: 'auto-assigned';
}

/**
 * Core assignment rule:
 * 1. Filter faculty by departmentId matching room's department
 * 2. Exclude already-allocated faculty for this exam
 * 3. Sort by lowest invigilationCount (fair distribution)
 * 4. Assign primary = index 0, backup = index 1 (if available)
 */
export function allocateInvigilators(
    examSlots: ExamSlot[],
    allFaculty: FacultyCandidate[],
    alreadyAllocated: AlreadyAllocated[] = []
): { assignments: InvigilatorAssignment[]; unassigned: string[] } {
    const assignments: InvigilatorAssignment[] = [];
    const unassigned: string[] = [];

    // Track who we've already assigned in this batch to avoid double-booking
    const thisRoundAssigned = new Set<string>();

    for (const slot of examSlots) {
        // Step 1: Filter by same department
        const departmentFaculty = allFaculty.filter(
            f => f.departmentId.toString() === slot.departmentId.toString() && f.isActive
        );

        // Step 2: Exclude already-allocated for this exam + this round
        const alreadyUsed = new Set([
            ...alreadyAllocated.filter(a => a.examId === slot.examId).map(a => a.facultyId),
            ...Array.from(thisRoundAssigned),
        ]);

        const available = departmentFaculty.filter(f => !alreadyUsed.has(f._id.toString()));

        // Step 3: Sort by least invigilation count
        available.sort((a, b) => a.invigilationCount - b.invigilationCount);

        if (available.length === 0) {
            unassigned.push(`Room ${slot.roomId} for exam ${slot.examId} — no available faculty in dept ${slot.departmentId}`);
            continue;
        }

        const primary = available[0];
        const backup = available.length > 1 ? available[1] : undefined;

        thisRoundAssigned.add(primary._id.toString());
        if (backup) thisRoundAssigned.add(backup._id.toString());

        assignments.push({
            examId: slot.examId,
            roomId: slot.roomId,
            departmentId: slot.departmentId,
            primaryInvigilatorId: primary._id.toString(),
            backupInvigilatorId: backup?._id.toString(),
            status: 'auto-assigned',
        });
    }

    return { assignments, unassigned };
}
