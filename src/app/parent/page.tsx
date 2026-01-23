"use client";

import { useAuthStore } from "@/store/useAuthStore";
import { useState } from "react";
import { useStudents } from "@/features/students/hooks/useStudents";
import { useGroups } from "@/features/groups/hooks/useGroups";
import { useStudentRecords } from "@/features/students/hooks/useStudentRecords";
import {
    LogOut,
    Home,
    User as UserIcon,
    Calendar,
    ChevronLeft,
    AlertCircle,
    MessageCircle,
    X,
    FileText
} from "lucide-react";
import { useRouter } from "next/navigation";
import { logout } from "@/features/auth/services/authService";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";

export default function ParentDashboard() {
    const { user } = useAuthStore();
    const router = useRouter();
    const { data: students, isLoading } = useStudents();
    const { data: groups } = useGroups();
    const [selectedKidForLeave, setSelectedKidForLeave] = useState<any>(null);

    const parentPhone = user?.displayName || "";
    const myKids = students?.filter(s => s.parentPhone === parentPhone) || [];

    const handleLogout = async () => {
        await logout();
        router.push("/login");
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50/50 font-sans pb-10" dir="rtl">
            <header className="bg-white border-b border-gray-100 px-4 py-3 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-2xl text-sm font-bold active:scale-95 transition-all"
                    >
                        <LogOut size={18} />
                        <span>خروج</span>
                    </button>

                    <div className="flex items-center gap-4">
                        <div className="text-center md:text-right hidden sm:block">
                            <p className="text-[10px] text-gray-400 font-bold">مرحباً بك يا</p>
                            <p className="text-sm font-black text-gray-900">{parentPhone}</p>
                        </div>
                        <div className="w-10 h-10 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                            <UserIcon size={20} />
                        </div>
                        <div className="h-8 w-[1px] bg-gray-100 hidden sm:block" />
                        <div className="bg-white w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm border border-gray-50">
                            <img src="/logo.png" alt="المنارة" className="w-6 h-6 object-contain opacity-50" />
                        </div>
                    </div>

                    <button className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-2xl text-sm font-bold active:scale-95 transition-all">
                        <Home size={18} />
                        <span className="hidden sm:inline">الرئيسية</span>
                    </button>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-8">
                <div className="flex items-center gap-3 mb-8 border-r-4 border-teal-500 pr-3">
                    <h1 className="text-2xl font-black text-gray-900">أبنائي الطلاب ({myKids.length})</h1>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {myKids.map((kid) => (
                        <StudentCard
                            key={kid.id}
                            kid={kid}
                            groups={groups || []}
                            router={router}
                            onLeaveRequest={() => setSelectedKidForLeave(kid)}
                        />
                    ))}

                    {myKids.length === 0 && (
                        <div className="col-span-full py-20 text-center space-y-4">
                            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto text-gray-400">
                                <AlertCircle size={40} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-600">عذراً، لم نجد طلاب مسجلين بهذا الرقم</h3>
                            <p className="text-gray-400">يرجى التواصل مع إدارة المركز للتحديث.</p>
                        </div>
                    )}
                </div>
            </main>

            {/* Leave Request Modal */}
            <AnimatePresence>
                {selectedKidForLeave && (
                    <LeaveRequestModal
                        kid={selectedKidForLeave}
                        onClose={() => setSelectedKidForLeave(null)}
                    />
                )}
            </AnimatePresence>

            {/* زر الدعم الفني عبر واتساب */}
            <button
                onClick={() => window.open('https://wa.me/201234567890', '_blank')}
                className="fixed bottom-6 left-6 w-14 h-14 bg-teal-600 text-white rounded-full shadow-2xl flex items-center justify-center z-40 active:scale-90 transition-all hover:bg-teal-700"
            >
                <MessageCircle size={28} />
            </button>
        </div>
    );
}

function LeaveRequestModal({ kid, onClose }: { kid: any, onClose: () => void }) {
    const { addLeave } = useStudentRecords(kid.id);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [reason, setReason] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!startDate || !endDate || !reason) return alert('يرجى ملء جميع الحقول');

        await addLeave.mutateAsync({
            studentId: kid.id,
            studentName: kid.fullName,
            startDate,
            endDate,
            reason
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" dir="rtl">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-white rounded-[40px] w-full max-w-md p-8 relative z-10 shadow-2xl"
            >
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-black text-gray-900 border-r-4 border-orange-500 pr-3">طلب إجازة</h2>
                    <button onClick={onClose} className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400">
                        <X size={20} />
                    </button>
                </div>

                <div className="mb-6">
                    <p className="text-xs text-gray-400 font-bold mb-1">الطالب:</p>
                    <p className="font-black text-gray-900">{kid.fullName}</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-400 mr-1">من تاريخ</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full h-12 bg-gray-50 border border-gray-100 rounded-2xl px-4 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-400 mr-1">إلى تاريخ</label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full h-12 bg-gray-50 border border-gray-100 rounded-2xl px-4 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 mr-1">السبب</label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="اكتب سبب الإجازة هنا..."
                            className="w-full h-24 bg-gray-50 border border-gray-100 rounded-2xl p-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                        />
                    </div>

                    <Button
                        type="submit"
                        disabled={addLeave.isPending}
                        className="w-full h-14 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-black text-lg shadow-xl shadow-orange-500/20"
                    >
                        {addLeave.isPending ? 'جاري الإرسال...' : 'إرسال الطلب'}
                    </Button>
                </form>
            </motion.div>
        </div>
    );
}

function StudentCard({ kid, groups, router, onLeaveRequest }: { kid: any, groups: any[], router: any, onLeaveRequest: () => void }) {
    const { attendance, exams, fees } = useStudentRecords(kid.id);
    const group = groups.find(g => g.id === kid.groupId);

    const presentCount = attendance.filter(a => a.status === 'present').length;
    const totalAttendance = attendance.length;

    // Check if there are unpaid fees
    const hasUnpaidFees = fees.length === 0;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-[40px] p-6 shadow-sm border border-gray-100 hover:shadow-xl hover:shadow-blue-500/5 transition-all group relative overflow-hidden"
        >
            {hasUnpaidFees && (
                <div className="absolute top-6 left-6">
                    <div className="bg-red-50 text-red-600 px-3 py-1 rounded-full text-[10px] font-black border border-red-100">
                        مطلوب سداد
                    </div>
                </div>
            )}

            <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 bg-teal-500 rounded-3xl flex items-center justify-center text-white shadow-lg shadow-teal-500/20">
                    <UserIcon size={32} />
                </div>

                <div>
                    <h2 className="text-xl font-black text-gray-900 mb-1">{kid.fullName}</h2>
                    <div className="flex items-center justify-center gap-2 text-xs font-bold text-teal-600">
                        <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
                        {group?.name || "بدون مجموعة"}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 w-full pt-4">
                    <div className="bg-gray-50/50 p-4 rounded-3xl border border-gray-100">
                        <p className="text-[10px] text-gray-400 font-bold mb-1">الحضور</p>
                        <div className="flex items-baseline justify-center gap-1">
                            <span className="text-lg font-black text-gray-900">{presentCount}</span>
                            <span className="text-xs text-gray-400">/ {totalAttendance || 0}</span>
                        </div>
                    </div>
                    <div className="bg-gray-50/50 p-4 rounded-3xl border border-gray-100">
                        <p className="text-[10px] text-gray-400 font-bold mb-1">الاختبارات</p>
                        <div className="flex items-baseline justify-center gap-1">
                            <span className="text-lg font-black text-gray-900">{exams.length}</span>
                            <span className="text-xs text-gray-400">سجل</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full pt-2">
                    <button
                        onClick={() => router.push(`/parent/student/${kid.id}`)}
                        className="flex-1 h-12 bg-white text-teal-600 border-2 border-teal-50 text-sm font-black rounded-2xl flex items-center justify-center gap-2 hover:bg-teal-50 transition-all active:scale-95"
                    >
                        عرض التفاصيل
                        <ChevronLeft size={16} />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onLeaveRequest();
                        }}
                        className="h-12 w-28 bg-orange-50 text-orange-600 text-xs font-black rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all hover:bg-orange-100"
                    >
                        <Calendar size={14} />
                        طلب إجازة
                    </button>
                </div>
            </div>
        </motion.div>
    );
}
