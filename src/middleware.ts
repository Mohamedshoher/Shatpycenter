import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// This middleware will run on all routes
export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Public routes that don't require authentication
    const publicRoutes = ['/login'];

    // Check if the current path is public
    const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));

    // For now, we'll allow all routes since we're using client-side auth
    // In production, you might want to use Firebase Admin SDK for server-side verification

    return NextResponse.next();
}

// Configure which routes to run middleware on
export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
    ],
};
