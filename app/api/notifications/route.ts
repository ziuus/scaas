import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Notification from '@/models/Notification';
import { verifyToken, getTokenFromHeader } from '@/lib/auth';

export async function GET(req: NextRequest) {
    try {
        const token = getTokenFromHeader(req.headers.get('authorization') ?? undefined);
        const user = token ? verifyToken(token) : null;
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        await dbConnect();
        const notifications = await Notification.find({ userId: user.userId }).sort({ createdAt: -1 }).limit(50);
        return NextResponse.json({ notifications });
    } catch (err) {
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    try {
        const token = getTokenFromHeader(req.headers.get('authorization') ?? undefined);
        const user = token ? verifyToken(token) : null;
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        await dbConnect();
        const { ids } = await req.json();
        await Notification.updateMany(
            { _id: { $in: ids }, userId: user.userId },
            { isRead: true }
        );
        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
