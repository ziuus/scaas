import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Faculty from '@/models/Faculty';
import Subject from '@/models/Subject';
import { verifyToken, getTokenFromHeader } from '@/lib/auth';

interface CSVFacultyRow {
    faculty_id?: string; facultyId?: string;
    faculty_name?: string; name?: string;
    department?: string; departmentId?: string;
    designation?: string;
    email?: string;
    max_weekly_load?: string; maxWeeklyLoad?: string;
}

interface CSVSubjectRow {
    subject_code?: string; subjectCode?: string;
    subject_name?: string; subjectName?: string;
    semester?: string;
    section?: string;
    subject_type?: string; subjectType?: string;
    hours_per_week?: string; hoursPerWeek?: string;
    department?: string; departmentId?: string;
}

export async function POST(req: NextRequest) {
    try {
        const token = getTokenFromHeader(req.headers.get('authorization') ?? undefined);
        const user = token ? verifyToken(token) : null;
        if (!user || !['principal', 'hod'].includes(user.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        await dbConnect();
        const { type, records } = await req.json();
        const errors: { row: number; error: string }[] = [];
        const inserted: unknown[] = [];

        if (type === 'faculty') {
            for (let i = 0; i < records.length; i++) {
                const r: CSVFacultyRow = records[i];
                try {
                    const facultyId = r.faculty_id || r.facultyId;
                    const name = r.faculty_name || r.name;
                    const email = r.email;
                    const departmentId = r.department || r.departmentId;
                    if (!facultyId || !name || !email || !departmentId) {
                        errors.push({ row: i + 1, error: 'Missing required fields: faculty_id, faculty_name, email, department' });
                        continue;
                    }
                    const doc = await Faculty.findOneAndUpdate(
                        { facultyId },
                        {
                            facultyId, name, email,
                            departmentId,
                            designation: r.designation || 'Assistant Professor',
                            maxWeeklyLoad: parseInt(r.max_weekly_load || r.maxWeeklyLoad || '18'),
                        },
                        { upsert: true, new: true }
                    );
                    inserted.push(doc);
                } catch (e) {
                    errors.push({ row: i + 1, error: String(e) });
                }
            }
        } else if (type === 'subjects') {
            for (let i = 0; i < records.length; i++) {
                const r: CSVSubjectRow = records[i];
                try {
                    const subjectCode = r.subject_code || r.subjectCode;
                    const subjectName = r.subject_name || r.subjectName;
                    const departmentId = r.department || r.departmentId;
                    if (!subjectCode || !subjectName || !departmentId) {
                        errors.push({ row: i + 1, error: 'Missing required fields: subject_code, subject_name, department' });
                        continue;
                    }
                    const doc = await Subject.findOneAndUpdate(
                        { subjectCode },
                        {
                            subjectCode, subjectName, departmentId,
                            semester: parseInt(r.semester || '1'),
                            section: r.section || 'A',
                            subjectType: (r.subject_type || r.subjectType || 'theory') as 'theory' | 'lab' | 'elective',
                            hoursPerWeek: parseInt(r.hours_per_week || r.hoursPerWeek || '3'),
                        },
                        { upsert: true, new: true }
                    );
                    inserted.push(doc);
                } catch (e) {
                    errors.push({ row: i + 1, error: String(e) });
                }
            }
        } else {
            return NextResponse.json({ error: 'Unknown import type. Use: faculty | subjects' }, { status: 400 });
        }

        return NextResponse.json({
            success: true,
            inserted: inserted.length,
            errors,
            total: records.length,
        });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
