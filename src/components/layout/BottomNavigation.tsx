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
        <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-gray-100 px-1 py-1.5 z-50 flex justify-around items-center md:hidden shadow-[0_-5px_20px_rgba(0,0,0,0.05)]">
            {filteredNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname.startsWith(item.href);

                return (
                    <Link
                        key={item.id}
                        href={item.href}
                        className={cn(
                            "flex flex-col items-center gap-1 flex-1 min-w-0 max-w-[72px] transition-all duration-300 py-1",
                            isActive ? "text-blue-600 scale-105" : "text-gray-400"
                        )}
                    >
                        <div className={cn(
                            "p-1.5 rounded-xl transition-all",
                            isActive ? "bg-blue-50" : "bg-transparent"
                        )}>
                            <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                        </div>
                        <span className={cn(
                            "text-[9px] font-bold truncate w-full text-center px-1",
                            isActive ? "text-blue-700 font-black" : "text-gray-400"
                        )}>
                            {item.label}
                        </span>
                    </Link>
                );
            })}
        </div>
    );
}
