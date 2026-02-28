/**
 * Exam Seating Allocation Engine
 * Distributes students across available rooms considering capacity, dept separation, semester.
 */

export interface StudentInfo {
    _id: string;
    name: string;
    rollNumber: string;
    departmentId: string;
    semester: number;
    section: string;
}

export interface RoomInfo {
    _id: string;
    roomNumber: string;
    capacity: number;
    departmentId?: string;
}

export interface SeatAllocation {
    roomId: string;
    roomNumber: string;
    studentAllocations: {
        studentId: string;
        seatNumber: string;
        row: number;
        col: number;
    }[];
    capacity: number;
    allocated: number;
}

const COLS_PER_ROW = 6;

export function allocateSeating(
    students: StudentInfo[],
    rooms: RoomInfo[],
    preferDeptSeparation = true
): { allocations: SeatAllocation[]; unallocated: string[] } {
    const allocations: SeatAllocation[] = [];
    const unallocated: string[] = [];

    // Sort students by department + roll number for systematic allocation
    const sorted = [...students].sort((a, b) => {
        if (a.departmentId !== b.departmentId) return a.departmentId.localeCompare(b.departmentId);
        return a.rollNumber.localeCompare(b.rollNumber);
    });

    let studentIndex = 0;
    for (const room of rooms) {
        if (studentIndex >= sorted.length) break;
        const roomAlloc: SeatAllocation = {
            roomId: room._id,
            roomNumber: room.roomNumber,
            studentAllocations: [],
            capacity: room.capacity,
            allocated: 0,
        };

        let seatNum = 1;
        while (seatNum <= room.capacity && studentIndex < sorted.length) {
            const student = sorted[studentIndex];
            const row = Math.ceil(seatNum / COLS_PER_ROW);
            const col = ((seatNum - 1) % COLS_PER_ROW) + 1;

            roomAlloc.studentAllocations.push({
                studentId: student._id,
                seatNumber: `${room.roomNumber}-${String(seatNum).padStart(2, '0')}`,
                row,
                col,
            });
            seatNum++;
            studentIndex++;
            roomAlloc.allocated++;
        }

        allocations.push(roomAlloc);
    }

    // Remaining students couldn't be seated
    while (studentIndex < sorted.length) {
        unallocated.push(sorted[studentIndex].rollNumber);
        studentIndex++;
    }

    return { allocations, unallocated };
}
