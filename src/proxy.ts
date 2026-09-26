import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth-server';

// ==========================================================
// حارس الصفحات: يتحقق من جلسة موقّعة حقيقية (Cookie httpOnly)
// بدل الاعتماد على ما يخزّنه المتصفح في localStorage.
// (الـ API routes تُطبّق حراستها الخاصة عبر requireSession)
// ==========================================================
export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const isLoginPage = pathname === '/login';

    const session = await getSession(request);

    if (!session && !isLoginPage) {
        const loginUrl = new URL('/login', request.url);
        return NextResponse.redirect(loginUrl);
    }

    if (session && isLoginPage) {
        const homeUrl = new URL(session.role === 'parent' ? '/parent' : '/', request.url);
        return NextResponse.redirect(homeUrl);
    }

    return NextResponse.next();
}

// Configure which routes to run proxy on
export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes: تُطبّق التحقق بنفسها عبر requireSession)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - manifest.json / icons (PWA)
         */
        '/((?!api|_next/static|_next/image|favicon.ico|manifest.json|icon-).*)',
    ],
};
