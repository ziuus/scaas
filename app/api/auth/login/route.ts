import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { signToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
    try {
        await dbConnect();
        const { email, password } = await req.json();
        if (!email || !password) {
            return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
        }
        const user = await User.findOne({ email: email.toLowerCase(), isActive: true })
            .populate('departmentId', 'name code');
        if (!user || !(await user.comparePassword(password))) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }
        const token = signToken({
            userId: user._id.toString(),
            email: user.email,
            role: user.role,
            departmentId: user.departmentId?._id?.toString(),
            name: user.name,
        });
        return NextResponse.json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                department: user.departmentId,
            },
        });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
