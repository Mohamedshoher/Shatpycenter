"use client";

import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import Link from 'next/link';
import {
    Users,
    LayoutGrid,
    CreditCard,
    CalendarCheck,
    FileSpreadsheet,
    User,
    Zap,
    MessageCircle,
    FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function BottomNavigation() {
    const pathname = usePathname();
    const { user } = useAuthStore();

    // إخفاء القائمة السفلية في صفحات ولي الأمر أو إذا كان المستخدم ولي أمر
    if (pathname.startsWith('/parent') || user?.role === 'parent' || pathname === '/login') {
        return null;
    }

    const navItems = [
        { id: 'home', label: 'مركز الشاطبي', icon: Zap, href: '/' },
        { id: 'students', label: 'الطلاب', icon: Users, href: '/students' },
        { id: 'attendance', label: 'الحضور', icon: CalendarCheck, href: '/attendance-report' },
        { id: 'groups', label: 'المجموعات', icon: LayoutGrid, href: '/groups' },
        { id: 'exams', label: 'الاختبارات', icon: FileText, href: '/exams-report' },
    ];

    const filteredNavItems = navItems.filter(item => {
        if (user?.role === 'teacher' && item.id === 'home') return false;
        return true;
    });

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-2 py-3 z-50 flex justify-around items-center md:hidden">
            {filteredNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname.startsWith(item.href);

                return (
                    <Link
                        key={item.id}
                        href={item.href}
                        className={cn(
                            "flex flex-col items-center gap-1 min-w-[64px]",
                            isActive ? "text-blue-600" : "text-gray-400"
                        )}
                    >
                        <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                        <span className="text-[10px] font-bold">{item.label}</span>
                    </Link>
                );
            })}
        </div>
    );
}
