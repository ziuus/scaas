import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Faculty from '@/models/Faculty';
import { verifyToken, getTokenFromHeader } from '@/lib/auth';

export async function GET(req: NextRequest) {
    try {
        const token = getTokenFromHeader(req.headers.get('authorization') ?? undefined);
        const user = token ? verifyToken(token) : null;
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        await dbConnect();
        const query: Record<string, unknown> = {};
        if (user.role === 'hod' && user.departmentId) query.departmentId = user.departmentId;
        const faculty = await Faculty.find(query).populate('departmentId', 'name code').sort({ name: 1 });
        return NextResponse.json({ faculty });
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
        const faculty = await Faculty.create(body);
        const populated = await Faculty.findById(faculty._id).populate('departmentId', 'name code');
        return NextResponse.json({ faculty: populated }, { status: 201 });
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
        const { id, _id, ...updates } = await req.json();
        const documentId = id || _id;
        const faculty = await Faculty.findByIdAndUpdate(documentId, updates, { new: true }).populate('departmentId', 'name code');
        return NextResponse.json({ faculty });
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
        await Faculty.findByIdAndDelete(id);
        return NextResponse.json({ success: true });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
