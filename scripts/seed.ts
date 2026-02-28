/**
 * Database Seed Script
 * Run: npx ts-node --project tsconfig.json scripts/seed.ts
 * Or: npx tsx scripts/seed.ts
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const MONGODB_URI = 'mongodb://localhost:27017/smart_college';

// Inline minimal schemas for seeding
const UserSchema = new mongoose.Schema({ name: String, email: String, password: String, role: String, departmentId: mongoose.Schema.Types.ObjectId, isActive: { type: Boolean, default: true } });
const DeptSchema = new mongoose.Schema({ name: String, code: String, hodId: mongoose.Schema.Types.ObjectId });
const FacultySchema = new mongoose.Schema({ facultyId: String, name: String, email: String, departmentId: mongoose.Schema.Types.ObjectId, designation: String, maxWeeklyLoad: { type: Number, default: 18 }, currentLoad: { type: Number, default: 0 }, invigilationCount: { type: Number, default: 0 }, isActive: { type: Boolean, default: true } });
const SubjectSchema = new mongoose.Schema({ subjectCode: String, subjectName: String, departmentId: mongoose.Schema.Types.ObjectId, semester: Number, section: String, subjectType: String, hoursPerWeek: Number });
const RoomSchema = new mongoose.Schema({ roomNumber: String, building: String, capacity: Number, departmentId: mongoose.Schema.Types.ObjectId, roomType: String, isAvailable: { type: Boolean, default: true } });
const StudentSchema = new mongoose.Schema({ studentId: String, name: String, email: String, departmentId: mongoose.Schema.Types.ObjectId, semester: Number, section: String, rollNumber: String });

const User = mongoose.models.User || mongoose.model('User', UserSchema);
const Department = mongoose.models.Department || mongoose.model('Department', DeptSchema);
const Faculty = mongoose.models.Faculty || mongoose.model('Faculty', FacultySchema);
const Subject = mongoose.models.Subject || mongoose.model('Subject', SubjectSchema);
const Room = mongoose.models.Room || mongoose.model('Room', RoomSchema);
const Student = mongoose.models.Student || mongoose.model('Student', StudentSchema);

async function seed() {
    await mongoose.connect(MONGODB_URI);
    console.log('🔗 Connected to MongoDB');

    // Clear existing data
    await Promise.all([User.deleteMany({}), Department.deleteMany({}), Faculty.deleteMany({}), Subject.deleteMany({}), Room.deleteMany({}), Student.deleteMany({})]);
    console.log('🗑️  Cleared existing data');

    // Departments
    const csDept = await Department.create({ name: 'Computer Science', code: 'CS' });
    const eceDept = await Department.create({ name: 'Electronics & Communication', code: 'ECE' });
    const mechDept = await Department.create({ name: 'Mechanical Engineering', code: 'MECH' });
    console.log('🏛️  Created departments');

    // Rooms
    await Room.insertMany([
        { roomNumber: 'CS-101', building: 'CS Block', capacity: 60, departmentId: csDept._id, roomType: 'classroom' },
        { roomNumber: 'CS-102', building: 'CS Block', capacity: 60, departmentId: csDept._id, roomType: 'classroom' },
        { roomNumber: 'CS-LAB1', building: 'CS Block', capacity: 40, departmentId: csDept._id, roomType: 'lab' },
        { roomNumber: 'ECE-201', building: 'ECE Block', capacity: 60, departmentId: eceDept._id, roomType: 'classroom' },
        { roomNumber: 'ECE-202', building: 'ECE Block', capacity: 60, departmentId: eceDept._id, roomType: 'classroom' },
        { roomNumber: 'HALL-A', building: 'Exam Block', capacity: 120, departmentId: csDept._id, roomType: 'exam_hall' },
        { roomNumber: 'HALL-B', building: 'Exam Block', capacity: 120, departmentId: eceDept._id, roomType: 'exam_hall' },
        { roomNumber: 'MECH-301', building: 'Mech Block', capacity: 60, departmentId: mechDept._id, roomType: 'classroom' },
    ]);
    console.log('🏫  Created rooms');

    // Faculty - CS dept
    const faculty = await Faculty.insertMany([
        { facultyId: 'FAC001', name: 'Dr. Alice Kumar', email: 'alice@college.edu', departmentId: csDept._id, designation: 'Associate Professor', maxWeeklyLoad: 16 },
        { facultyId: 'FAC002', name: 'Prof. Bob Singh', email: 'bob@college.edu', departmentId: csDept._id, designation: 'Assistant Professor', maxWeeklyLoad: 18 },
        { facultyId: 'FAC003', name: 'Dr. Carol Mehta', email: 'carol@college.edu', departmentId: csDept._id, designation: 'Professor', maxWeeklyLoad: 14 },
        { facultyId: 'FAC004', name: 'Prof. David Raj', email: 'david@college.edu', departmentId: eceDept._id, designation: 'Assistant Professor', maxWeeklyLoad: 18 },
        { facultyId: 'FAC005', name: 'Dr. Eva Thomas', email: 'eva@college.edu', departmentId: eceDept._id, designation: 'Associate Professor', maxWeeklyLoad: 16 },
        { facultyId: 'FAC006', name: 'Prof. Frank Nair', email: 'frank@college.edu', departmentId: mechDept._id, designation: 'Assistant Professor', maxWeeklyLoad: 18 },
    ]);
    console.log('👩‍🏫  Created faculty');

    // Subjects - CS sem 3
    await Subject.insertMany([
        { subjectCode: 'CS301', subjectName: 'Data Structures', departmentId: csDept._id, semester: 3, section: 'A', subjectType: 'theory', hoursPerWeek: 4 },
        { subjectCode: 'CS302', subjectName: 'Database Management Systems', departmentId: csDept._id, semester: 3, section: 'A', subjectType: 'theory', hoursPerWeek: 3 },
        { subjectCode: 'CS303', subjectName: 'Operating Systems', departmentId: csDept._id, semester: 3, section: 'A', subjectType: 'theory', hoursPerWeek: 4 },
        { subjectCode: 'CS304', subjectName: 'DBMS Lab', departmentId: csDept._id, semester: 3, section: 'A', subjectType: 'lab', hoursPerWeek: 2 },
        { subjectCode: 'ECE301', subjectName: 'Digital Electronics', departmentId: eceDept._id, semester: 3, section: 'A', subjectType: 'theory', hoursPerWeek: 4 },
        { subjectCode: 'ECE302', subjectName: 'Signals & Systems', departmentId: eceDept._id, semester: 3, section: 'A', subjectType: 'theory', hoursPerWeek: 3 },
    ]);
    console.log('📚  Created subjects');

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
    await Student.insertMany(studentData);
    console.log('👩‍🎓  Created 60 students');

    // Hash password
    const hashedPassword = await bcrypt.hash('demo123', 12);

    // Users
    await User.insertMany([
        { name: 'Dr. Principal Sharma', email: 'principal@college.edu', password: hashedPassword, role: 'principal', isActive: true },
        { name: 'Prof. HOD Ramesh', email: 'hod.cs@college.edu', password: hashedPassword, role: 'hod', departmentId: csDept._id, isActive: true },
        { name: 'Dr. Alice Kumar', email: 'faculty1@college.edu', password: hashedPassword, role: 'faculty', departmentId: csDept._id, facultyId: faculty[0]._id, isActive: true },
    ]);
    console.log('👤  Created users (password: demo123)');

    console.log('\n✅ Seed complete! Login credentials:');
    console.log('  Principal: principal@college.edu / demo123');
    console.log('  HOD:       hod.cs@college.edu / demo123');
    console.log('  Faculty:   faculty1@college.edu / demo123');

    await mongoose.disconnect();
}

seed().catch(err => { console.error('Seed error:', err); process.exit(1); });
