import { SignJWT, jwtVerify } from 'jose';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import type { UserRole } from '@/types';

// ==========================================================
// جلسة المصادقة على جانب الخادم (JWT موقّع + Cookie آمن)
// تحل محل الاعتماد على localStorage كمصدر ثقة لهوية المستخدم
// ==========================================================

export const SESSION_COOKIE = 'shatibi_session';
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 يوماً

function getSecretKey(): Uint8Array {
    const secret = process.env.AUTH_SECRET;
    if (!secret || secret.length < 16) {
        // فشل واضح بدل السماح بجلسات غير آمنة أو تعطّل صامت
        throw new Error('AUTH_SECRET غير مضبوط. أضف متغير بيئة AUTH_SECRET (32 حرفاً على الأقل) قبل تشغيل التطبيق.');
    }
    return new TextEncoder().encode(secret);
}

export interface SessionPayload {
    uid: string;
    role: UserRole;
    displayName: string;
    teacherId?: string;
    phone?: string;
    responsibleSections?: string[];
    [key: string]: unknown;
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
    return await new SignJWT(payload as Record<string, unknown>)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
        .sign(getSecretKey());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
    try {
        const { payload } = await jwtVerify(token, getSecretKey());
        return payload as unknown as SessionPayload;
    } catch {
        return null;
    }
}

/** يقرأ جلسة المستخدم من الكوكيز داخل Route Handler أو Middleware */
export async function getSession(request: NextRequest): Promise<SessionPayload | null> {
    const token = request.cookies.get(SESSION_COOKIE)?.value;
    if (!token) return null;
    return verifySessionToken(token);
}

export const sessionCookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
};

/**
 * حارس صلاحيات لاستخدامه في بداية كل Route Handler:
 *   const session = await requireSession(request);
 *   if (session instanceof NextResponse) return session; // غير مصرّح
 * مرّر allowedRoles لتقييد الوصول لأدوار محددة فقط.
 */
export async function requireSession(
    request: NextRequest,
    allowedRoles?: UserRole[]
): Promise<SessionPayload | NextResponse> {
    const session = await getSession(request);
    if (!session) {
        return NextResponse.json({ error: 'يجب تسجيل الدخول' }, { status: 401 });
    }
    if (allowedRoles && !allowedRoles.includes(session.role)) {
        return NextResponse.json({ error: 'لا تملك صلاحية الوصول لهذا المورد' }, { status: 403 });
    }
    return session;
}
