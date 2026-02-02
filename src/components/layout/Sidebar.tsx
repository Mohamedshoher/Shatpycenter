"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { useUIStore } from '@/store/useUIStore';
import { cn } from '@/lib/utils';
import {
    LayoutDashboard,
    LayoutGrid,
    Users,
    GraduationCap,
    Wallet,
    Settings,
    LogOut,
    X,
    CalendarCheck,
    FileText,
    Archive,
    MessageCircle,
    Zap,
    UserCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { logout } from '@/features/auth/services/authService';
import { useRouter } from 'next/navigation';

export default function Sidebar() {
    const { user, setUser } = useAuthStore();
    const { isSidebarOpen, setSidebarOpen } = useUIStore();
    const pathname = usePathname();
    const router = useRouter();

    const handleLogout = async () => {
        await logout();
        setUser(null);
        router.replace('/login');
    };

    const navItems = [
        {
            label: 'الرئيسية',
            href: '/',
            icon: LayoutDashboard,
            roles: ['director', 'supervisor', 'parent']
        },
        {
            label: 'الطلاب',
            href: '/students',
            icon: GraduationCap,
            roles: ['director', 'supervisor', 'teacher']
        },
        {
            label: 'طلاب جدد',
            href: '/students/pending',
            icon: UserCheck,
            roles: ['director']
        },
        {
            label: 'أرشيف الطلاب',
            href: '/students/archive',
            icon: Archive,
            roles: ['director']
        },
        {
            label: user?.role === 'teacher' ? 'صفحتي' : 'المعلمين',
            href: '/teachers',
            icon: Users,
            roles: ['director', 'supervisor', 'teacher']
        },
        {
            label: 'المجموعات',
            href: '/groups',
            icon: LayoutGrid,
            roles: ['director', 'supervisor', 'teacher']
        },
        {
            label: 'المالية',
            href: '/finance',
            icon: Wallet,
            roles: ['director']
        },
        {
            label: 'تقارير الحضور',
            href: '/attendance-report',
            icon: CalendarCheck,
            roles: ['director', 'supervisor', 'teacher']
        },
        {
            label: 'تقارير الاختبارات',
            href: '/exams-report',
            icon: FileText,
            roles: ['director', 'supervisor', 'teacher']
        },
        {
            label: 'الرسائل',
            href: '/chat',
            icon: MessageCircle,
            roles: ['director', 'supervisor', 'teacher', 'parent']
        },
        {
            label: 'الأتمتة',
            href: '/automation',
            icon: Zap,
            roles: ['director']
        },
    ];


    const filteredNavItems = navItems.filter(item =>
        user && item.roles.includes(user.role)
    );

    return (
        <>
            {/* Mobile Overlay */}
            <AnimatePresence>
                {isSidebarOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setSidebarOpen(false)}
                        className="fixed inset-0 bg-black/50 z-40 md:hidden"
                    />
                )}
            </AnimatePresence>

            {/* Swipe Area - منطقة السحب من اليمين لفتح السيدبار */}
            {!isSidebarOpen && (
                <motion.div
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={0.3}
                    onDragStart={() => {
                        // يمكن إضافة ردود فعل بصرية عند بدء السحب
                    }}
                    onDrag={(e, info) => {
                        // يمكن إضافة تأثيرات أثناء السحب
                        if (info.offset.x < -20) {
                            // بدأ المستخدم بالسحب بشكل ملحوظ
                        }
                    }}
                    onDragEnd={(e, info) => {
                        // إذا سحب من اليمين لليسار بمسافة كافية، افتح السيدبار
                        if (info.offset.x < -60) {
                            setSidebarOpen(true);
                        }
                    }}
                    className="fixed top-0 right-0 h-screen w-12 z-30 md:hidden"
                    style={{
                        touchAction: 'pan-y',
                        background: 'linear-gradient(to left, rgba(59, 130, 246, 0.05), transparent)'
                    }}
                >
                    {/* مؤشر بصري خفيف */}
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-16 bg-blue-400/20 rounded-l-full" />
                </motion.div>
            )}

            {/* Sidebar Container */}
            <motion.aside
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                onDragEnd={(e, info) => {
                    // إذا سحب المستخدم لليمين بقوة (في RTL هذا يعني الإغلاق)
                    if (info.offset.x > 100) setSidebarOpen(false);
                    // إذا سحب لليسار بقوة (في RTL هذا يعني الفتح، لكنه مفتوح أصلاً هنا)
                    if (info.offset.x < -100) setSidebarOpen(true);
                }}
                className={cn(
                    "fixed top-0 right-0 z-[120] h-screen w-64 bg-white border-l border-gray-100 shadow-xl transition-transform duration-300 md:translate-x-0",
                    !isSidebarOpen && "translate-x-full"
                )}
            >
                <div className="h-full flex flex-col">
                    {/* Header */}
                    <div className="h-16 flex items-center justify-between px-4 border-b border-gray-100">
                        <div className="flex items-center gap-2">
                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm p-1.5 border border-gray-50">
                                <img src="/icon-192.png" alt="Logo" className="w-full h-full object-contain" />
                            </div>
                            <span className="text-lg font-black text-gray-900 tracking-tighter">مركز الشاطبي</span>
                        </div>
                        <button
                            onClick={() => setSidebarOpen(false)}
                            className="md:hidden p-1 rounded-md hover:bg-gray-100"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-1.5 custom-scrollbar">
                        {filteredNavItems.map((item) => {
                            const Icon = item.icon;
                            // التأكد من أن التحديد دقيق ولا يتداخل مع الروابط الفرعية التي لها خيار منفصل في القائمة
                            const isExactMatch = pathname === item.href;
                            const isSubMatch = item.href !== '/' && pathname.startsWith(`${item.href}/`);
                            const hasMoreSpecificMatch = filteredNavItems.some(
                                other => other.href !== item.href && other.href.startsWith(item.href) && pathname.startsWith(other.href)
                            );

                            const isActive = isExactMatch || (isSubMatch && !hasMoreSpecificMatch);

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setSidebarOpen(false)} // Close on mobile navigation
                                    className={cn(
                                        "flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200",
                                        isActive
                                            ? "bg-blue-600 text-white shadow-lg shadow-blue-200"
                                            : "text-gray-600 hover:bg-blue-50 hover:text-blue-700"
                                    )}
                                >
                                    <Icon size={18} className={cn(isActive ? "text-white" : "text-gray-400")} />
                                    <span>{item.label}</span>
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Footer / User Profile & Logout */}
                    <div className="mt-auto p-3 pb-12 md:pb-6 border-t border-gray-100 bg-gray-50/50 space-y-2">
                        {/* User Profile Card */}
                        <div className="flex items-center gap-3 bg-white p-2 rounded-[20px] border border-gray-100 shadow-sm overflow-hidden">
                            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white text-sm font-black shrink-0 shadow-sm shadow-blue-200">
                                {user?.displayName?.[0] || 'U'}
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <p className={cn(
                                    "truncate text-gray-900 leading-tight mb-0.5",
                                    user?.role === 'teacher' ? "text-[10px] font-bold" : "text-sm font-black"
                                )}>
                                    {user?.displayName || 'مستخدم'}
                                </p>
                                <p className="text-[10px] text-blue-500 font-bold uppercase tracking-wider truncate">
                                    {user?.role === 'director' ? 'المدير العام' : user?.role === 'teacher' ? 'مدرس' : 'مراقب'}
                                </p>
                            </div>
                        </div>

                        {/* Full Logout Button with Text */}
                        <button
                            onClick={handleLogout}
                            className="flex items-center justify-center gap-2 w-full px-4 py-3 text-sm font-black text-red-600 bg-red-50 hover:bg-red-600 hover:text-white rounded-[20px] border border-red-100 transition-all active:scale-95 shadow-sm"
                        >
                            <LogOut size={18} />
                            <span>تسجيل الخروج</span>
                        </button>
                    </div>
                </div>
            </motion.aside>
        </>
    );
}
