/**
 * Smart Replacement Engine
 * Finds best available replacement faculty for a given leave slot.
 * Priority: same subject > same department with lowest load > any dept with lowest load.
 */

export interface FacultyInfo {
    _id: string;
    name: string;
    email: string;
    departmentId: string;
    currentLoad: number;
    maxWeeklyLoad: number;
}

export interface SubjectMapping {
    facultyId: string;
    subjectId: string;
}

export interface BusySlot {
    facultyId: string;
    day: string;
    startTime: string;
    endTime: string;
}

export interface ReplacementSuggestion {
    facultyId: string;
    facultyName: string;
    reason: string;
    priority: number; // lower = better
    loadPercentage: number;
}

export function findReplacements(
    subjectId: string,
    departmentId: string,
    slotDay: string,
    slotStartTime: string,
    slotEndTime: string,
    allFaculty: FacultyInfo[],
    subjectMappings: SubjectMapping[],
    busySlots: BusySlot[],
    excludeFacultyId: string
): ReplacementSuggestion[] {
    const suggestions: ReplacementSuggestion[] = [];

    // Faculties that teach the same subject
    const subjectFacultyIds = new Set(
        subjectMappings.filter(m => m.subjectId === subjectId).map(m => m.facultyId)
    );

    // Faculties busy at the given slot
    const busyFacultyIds = new Set(
        busySlots
            .filter(s => s.day === slotDay && s.startTime === slotStartTime && s.endTime === slotEndTime)
            .map(s => s.facultyId)
    );

    for (const faculty of allFaculty) {
        if (faculty._id === excludeFacultyId) continue;
        if (busyFacultyIds.has(faculty._id)) continue; // Not free
        if (faculty.currentLoad >= faculty.maxWeeklyLoad) continue; // Overloaded

        const loadPercentage = Math.round((faculty.currentLoad / faculty.maxWeeklyLoad) * 100);
        let priority = 3;
        let reason = '';

        if (subjectFacultyIds.has(faculty._id)) {
            priority = 1;
            reason = 'Teaches same subject';
        } else if (faculty.departmentId === departmentId) {
            priority = 2;
            reason = 'Same department, available';
        } else {
            reason = 'Available (different dept)';
        }

        suggestions.push({ facultyId: faculty._id, facultyName: faculty.name, reason, priority, loadPercentage });
    }

    // Sort: lower priority first, then by load
    suggestions.sort((a, b) => a.priority - b.priority || a.loadPercentage - b.loadPercentage);

    return suggestions.slice(0, 5); // Return top 5 suggestions
}
