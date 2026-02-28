import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Subject from '@/models/Subject';
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
        const subjects = await Subject.find(query).populate('departmentId', 'name code').sort({ semester: 1 });
        return NextResponse.json({ subjects });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const token = getTokenFromHeader(req.headers.get('authorization') ?? undefined);
        const user = token ? verifyToken(token) : null;
        if (!user || !['principal', 'hod'].includes(user.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        await dbConnect();
        const body = await req.json();
        const subject = await Subject.create(body);
        const populated = await Subject.findById(subject._id).populate('departmentId', 'name code');
        return NextResponse.json({ subject: populated }, { status: 201 });
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
        const subject = await Subject.findByIdAndUpdate(id, updates, { new: true }).populate('departmentId', 'name code');
        return NextResponse.json({ subject });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const token = getTokenFromHeader(req.headers.get('authorization') ?? undefined);
        const user = token ? verifyToken(token) : null;
        if (!user || !['principal', 'hod'].includes(user.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        await dbConnect();
        const { id } = await req.json();
        await Subject.findByIdAndDelete(id);
        return NextResponse.json({ success: true });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
