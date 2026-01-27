"use client";

import Sidebar from '@/components/layout/Sidebar';
import { ChatFloatingButton } from '@/components/ChatFloatingButton';
import { PresenceTracker } from '@/components/PresenceTracker';
import SyncManager from '@/components/SyncManager';
import { usePathname, useRouter } from 'next/navigation';
import { useUIStore } from '@/store/useUIStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useEffect } from 'react';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const router = useRouter();
    const { user } = useAuthStore();
    const { setSidebarOpen } = useUIStore();

    // منع أولياء الأمور من دخول لوحة تحكم الإدارة
    useEffect(() => {
        if (user?.role === 'parent') {
            router.push('/parent');
        }
    }, [user, router]);

    if (user?.role === 'parent') return null; // تجنب الوميض (flash) قبل التوجيه

    return (
        <div className="flex min-h-screen bg-gray-50 text-right overflow-x-hidden">
            <PresenceTracker />

            {/* منطقة السحب لفتح القائمة الجانبية على الموبيل */}
            <div
                className="fixed top-0 right-0 bottom-0 w-4 z-[45] md:hidden"
                onTouchStart={(e) => {
                    const touch = e.touches[0];
                    const startX = touch.clientX;
                    const handleTouchMove = (moveEvent: TouchEvent) => {
                        const moveX = moveEvent.touches[0].clientX;
                        if (startX - moveX > 50) { // سحب من اليمين لليسار
                            setSidebarOpen(true);
                            document.removeEventListener('touchmove', handleTouchMove);
                        }
                    };
                    document.addEventListener('touchmove', handleTouchMove);
                    document.addEventListener('touchend', () => {
                        document.removeEventListener('touchmove', handleTouchMove);
                    }, { once: true });
                }}
            />

            <Sidebar />

            <div className="flex-1 flex flex-col md:mr-64 transition-all duration-300">
                <main className="flex-1 overflow-y-auto">
                    {children}
                </main>
            </div>

            {pathname !== '/chat' && <ChatFloatingButton />}
            <SyncManager />
        </div>
    );
}
