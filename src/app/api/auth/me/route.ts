import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth-server';
import type { User } from '@/types';

export async function GET(request: NextRequest) {
    const session = await getSession(request);
    if (!session) {
        return NextResponse.json({ user: null }, { status: 401 });
    }

    const user: User = {
        uid: session.uid,
        email: `${session.teacherId || session.phone || session.role}@shatibi.center`,
        displayName: session.displayName,
        role: session.role,
        teacherId: session.teacherId,
        responsibleSections: session.responsibleSections,
        createdAt: Date.now(),
    };

    return NextResponse.json({ user });
}
