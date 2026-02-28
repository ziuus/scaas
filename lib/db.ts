/**
 * Database connection using mongodb-memory-server for zero-setup development.
 * An in-process MongoDB server is started automatically — no installation needed.
 * Demo data is auto-seeded on first run so the app works immediately.
 */
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

declare global {
    // eslint-disable-next-line no-var
    var __mongoServer: MongoMemoryServer | undefined;
    // eslint-disable-next-line no-var
    var __mongoConn: typeof mongoose | null;
    // eslint-disable-next-line no-var
    var __seeded: boolean;
}

let cached: typeof mongoose | null = global.__mongoConn ?? null;

async function dbConnect(): Promise<typeof mongoose> {
    if (cached) return cached;

    // Start in-memory MongoDB if not already running
    if (!global.__mongoServer) {
        global.__mongoServer = await MongoMemoryServer.create();
    }

    const uri = global.__mongoServer.getUri();

    cached = await mongoose.connect(uri, { bufferCommands: false });
    global.__mongoConn = cached;

    // Auto-seed demo data once
    if (!global.__seeded) {
        global.__seeded = true;
        await seedDemoData();
    }

    return cached;
}

async function seedDemoData() {
    // Lazy imports to avoid circular deps
    const { default: bcrypt } = await import('bcryptjs');

    // Check if already seeded
    const UserModel = mongoose.models.User || (await import('@/models/User')).default;
    const existing = await UserModel.findOne({ email: 'principal@college.edu' });
    if (existing) return; // Already seeded

    const DepartmentModel = mongoose.models.Department || (await import('@/models/Department')).default;
    const FacultyModel = mongoose.models.Faculty || (await import('@/models/Faculty')).default;
    const SubjectModel = mongoose.models.Subject || (await import('@/models/Subject')).default;
    const RoomModel = mongoose.models.Room || (await import('@/models/Room')).default;
    const StudentModel = mongoose.models.Student || (await import('@/models/Student')).default;

    console.log('🌱 Seeding demo data...');

    // Departments
    const csDept = await DepartmentModel.create({ name: 'Computer Science', code: 'CS' });
    const eceDept = await DepartmentModel.create({ name: 'Electronics & Communication', code: 'ECE' });
    const mechDept = await DepartmentModel.create({ name: 'Mechanical Engineering', code: 'MECH' });

    // Rooms
    await RoomModel.insertMany([
        { roomNumber: 'CS-101', building: 'CS Block', capacity: 60, departmentId: csDept._id, roomType: 'classroom' },
        { roomNumber: 'CS-102', building: 'CS Block', capacity: 60, departmentId: csDept._id, roomType: 'classroom' },
        { roomNumber: 'CS-LAB1', building: 'CS Block', capacity: 40, departmentId: csDept._id, roomType: 'lab' },
        { roomNumber: 'ECE-201', building: 'ECE Block', capacity: 60, departmentId: eceDept._id, roomType: 'classroom' },
        { roomNumber: 'ECE-202', building: 'ECE Block', capacity: 60, departmentId: eceDept._id, roomType: 'classroom' },
        { roomNumber: 'HALL-A', building: 'Exam Block', capacity: 120, departmentId: csDept._id, roomType: 'exam_hall' },
        { roomNumber: 'HALL-B', building: 'Exam Block', capacity: 120, departmentId: eceDept._id, roomType: 'exam_hall' },
        { roomNumber: 'MECH-301', building: 'Mech Block', capacity: 60, departmentId: mechDept._id, roomType: 'classroom' },
    ]);

    // Faculty
    const faculty = await FacultyModel.insertMany([
        { facultyId: 'FAC001', name: 'Dr. Alice Kumar', email: 'alice@college.edu', departmentId: csDept._id, designation: 'Associate Professor', maxWeeklyLoad: 16, currentLoad: 8 },
        { facultyId: 'FAC002', name: 'Prof. Bob Singh', email: 'bob@college.edu', departmentId: csDept._id, designation: 'Assistant Professor', maxWeeklyLoad: 18, currentLoad: 12 },
        { facultyId: 'FAC003', name: 'Dr. Carol Mehta', email: 'carol@college.edu', departmentId: csDept._id, designation: 'Professor', maxWeeklyLoad: 14, currentLoad: 10 },
        { facultyId: 'FAC004', name: 'Prof. David Raj', email: 'david@college.edu', departmentId: eceDept._id, designation: 'Assistant Professor', maxWeeklyLoad: 18, currentLoad: 14 },
        { facultyId: 'FAC005', name: 'Dr. Eva Thomas', email: 'eva@college.edu', departmentId: eceDept._id, designation: 'Associate Professor', maxWeeklyLoad: 16, currentLoad: 6 },
        { facultyId: 'FAC006', name: 'Prof. Frank Nair', email: 'frank@college.edu', departmentId: mechDept._id, designation: 'Assistant Professor', maxWeeklyLoad: 18, currentLoad: 16 },
    ]);

    // Subjects
    await SubjectModel.insertMany([
        { subjectCode: 'CS301', subjectName: 'Data Structures', departmentId: csDept._id, semester: 3, section: 'A', subjectType: 'theory', hoursPerWeek: 4 },
        { subjectCode: 'CS302', subjectName: 'Database Management Systems', departmentId: csDept._id, semester: 3, section: 'A', subjectType: 'theory', hoursPerWeek: 3 },
        { subjectCode: 'CS303', subjectName: 'Operating Systems', departmentId: csDept._id, semester: 3, section: 'A', subjectType: 'theory', hoursPerWeek: 4 },
        { subjectCode: 'CS304', subjectName: 'DBMS Lab', departmentId: csDept._id, semester: 3, section: 'A', subjectType: 'lab', hoursPerWeek: 2 },
        { subjectCode: 'ECE301', subjectName: 'Digital Electronics', departmentId: eceDept._id, semester: 3, section: 'A', subjectType: 'theory', hoursPerWeek: 4 },
        { subjectCode: 'ECE302', subjectName: 'Signals & Systems', departmentId: eceDept._id, semester: 3, section: 'A', subjectType: 'theory', hoursPerWeek: 3 },
    ]);

    // Students
    const studentData = [];
    for (let i = 1; i <= 60; i++) {
        studentData.push({
            studentId: `STU${String(i).padStart(3, '0')}`,
            name: `Student ${i}`,
            email: `student${i}@college.edu`,
            departmentId: i <= 40 ? csDept._id : eceDept._id,
            semester: 3,
            section: 'A',
            rollNumber: `2023CS${String(i).padStart(3, '0')}`,
        });
    }
    await StudentModel.insertMany(studentData);

    // Users (hashed passwords)
    const hashedPassword = await bcrypt.hash('demo123', 10);
    await UserModel.insertMany([
        { name: 'Dr. Principal Sharma', email: 'principal@college.edu', password: hashedPassword, role: 'principal', isActive: true },
        { name: 'Prof. HOD Ramesh', email: 'hod.cs@college.edu', password: hashedPassword, role: 'hod', departmentId: csDept._id, isActive: true },
        { name: 'Dr. Alice Kumar', email: 'faculty1@college.edu', password: hashedPassword, role: 'faculty', departmentId: csDept._id, facultyId: faculty[0]._id, isActive: true },
    ]);

    console.log('✅ Demo data seeded! Credentials: principal@college.edu | hod.cs@college.edu | faculty1@college.edu — all with password: demo123');
}

export default dbConnect;
