"use client";

import { useAuthStore } from "@/store/useAuthStore";
import { useState } from "react";
import { useStudents } from "@/features/students/hooks/useStudents";
import { useGroups } from "@/features/groups/hooks/useGroups";
import { useStudentRecords } from "@/features/students/hooks/useStudentRecords";
import { useTeachers } from "@/features/teachers/hooks/useTeachers";
import { ParentChatModal } from "@/features/chat/components/ParentChatModal";
import { ParentStudentDetailModal } from "@/features/students/components/ParentStudentDetailModal";
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
    const { user, setUser } = useAuthStore();
    const router = useRouter();
    const { data: students, isLoading } = useStudents();
    const { data: groups } = useGroups();
    const [selectedKidForLeave, setSelectedKidForLeave] = useState<any>(null);
    const [selectedKidForDetail, setSelectedKidForDetail] = useState<any>(null);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const { data: teachers } = useTeachers();

    const parentPhone = user?.displayName || "";
    const myKids = students?.filter(s => s.parentPhone === parentPhone) || [];

    // Filter allowed contacts for chat
    const allowedContacts = teachers?.filter(t => {
        // 1. Director & Supervisor are always allowed
        if (t.role === 'supervisor') return true;
        // 2. Teachers of the parent's children
        const kidTeacherIds = myKids.map(k => k.groupId).map(gid => groups?.find(g => g.id === gid)?.teacherId);
        if (kidTeacherIds.includes(t.id)) return true;
        return false;
    }) || [];

    // Add Director as a manual contact if not in teachers (assuming mock-director)
    const contacts = [
        { id: 'director', fullName: 'المدير العام', role: 'director' },
        ...allowedContacts
    ];

    const handleLogout = async () => {
        await logout();
        setUser(null);
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
                <div className="max-w-7xl mx-auto flex items-center justify-between relative h-10">
                    {/* Right: Logout Button */}
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-xl text-xs font-bold active:scale-95 transition-all shrink-0"
                    >
                        <LogOut size={16} />
                        <span className="hidden sm:inline">خروج</span>
                    </button>

                    {/* Center: Logo */}
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                        <div className="bg-white w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm border border-gray-100">
                            <img src="/logo.png" alt="المنارة" className="w-6 h-6 object-contain" />
                        </div>
                    </div>

                    {/* Left: Navigation Buttons */}
                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            onClick={() => setIsChatOpen(true)}
                            className="relative flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-bold active:scale-95 transition-all"
                        >
                            <MessageCircle size={16} />
                            <span className="hidden sm:inline">المراسلة</span>
                        </button>
                        <button className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-xs font-bold active:scale-95 transition-all">
                            <Home size={16} />
                            <span className="hidden sm:inline">الرئيسية</span>
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-8">
                {/* Welcome Message Section */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-10 text-right"
                >
                    <h2 className="text-3xl md:text-4xl font-black text-gray-900 leading-tight">
                        {myKids.length > 0
                            ? `مرحباً ولي أمر ${myKids.map(k => k.fullName.split(' ')[0]).join(' و ')} 👋`
                            : "مرحباً بك ولي أمرنا العزيز 👋"}
                    </h2>
                    <p className="text-gray-400 font-bold mt-2 text-sm md:text-base">
                        يسعدنا متابعتك لتقدم أبنائك في مركز الشاطبي التعليمي
                    </p>
                </motion.div>

                <div className="flex items-center gap-3 mb-8 border-r-4 border-teal-500 pr-3">
                    <h1 className="text-xl font-black text-gray-600 uppercase tracking-wide">أبنائي الطلاب ({myKids.length})</h1>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {myKids.map((kid) => (
                        <StudentCard
                            key={kid.id}
                            kid={kid}
                            groups={groups || []}
                            teachers={teachers || []}
                            onSelect={() => setSelectedKidForDetail(kid)}
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

            {/* Student Detail Modal */}
            <AnimatePresence>
                {selectedKidForDetail && (
                    <ParentStudentDetailModal
                        isOpen={!!selectedKidForDetail}
                        onClose={() => setSelectedKidForDetail(null)}
                        student={selectedKidForDetail}
                        group={groups?.find(g => g.id === selectedKidForDetail.groupId)}
                        teacher={teachers?.find(t => t.id === groups?.find(g => g.id === selectedKidForDetail.groupId)?.teacherId)}
                    />
                )}
            </AnimatePresence>

            {/* Leave Request Modal */}
            <AnimatePresence>
                {selectedKidForLeave && (
                    <LeaveRequestModal
                        kid={selectedKidForLeave}
                        onClose={() => setSelectedKidForLeave(null)}
                    />
                )}
            </AnimatePresence>

            {/* Parent Chat Modal */}
            <AnimatePresence>
                {isChatOpen && (
                    <ParentChatModal
                        isOpen={isChatOpen}
                        onClose={() => setIsChatOpen(false)}
                        contacts={contacts}
                    />
                )}
            </AnimatePresence>

            {/* زر الدعم الفني عبر واتساب (اختياري الآن) */}
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

        try {
            await addLeave.mutateAsync({
                studentId: kid.id,
                studentName: kid.fullName,
                startDate,
                endDate,
                reason
            });
            onClose();
        } catch (err) {
            console.error("Error submitting leave request:", err);
            // Error is already handled by mutation or mock success, 
            // but we catch here to prevent crash if mutation throws.
        }
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

function StudentCard({ kid, groups, teachers, onSelect, onLeaveRequest }: { kid: any, groups: any[], teachers: any[], onSelect: () => void, onLeaveRequest: () => void }) {
    const { attendance, exams, fees } = useStudentRecords(kid.id);
    const group = groups.find(g => g.id === kid.groupId);
    const teacher = teachers.find(t => t.id === group?.teacherId);

    const presentCount = attendance.filter(a => a.status === 'present').length;
    const totalAttendance = attendance.length;

    // Check if there are unpaid fees
    const hasUnpaidFees = fees.length === 0;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={onSelect}
            className="bg-white rounded-[40px] p-6 shadow-sm border border-gray-100 hover:shadow-2xl hover:shadow-blue-500/10 transition-all group relative overflow-hidden cursor-pointer active:scale-[0.98]"
        >
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-bl-[100px] -mr-10 -mt-10 group-hover:scale-110 transition-transform" />

            <div className="absolute top-6 left-6 z-10 flex flex-col gap-2 items-end">
                {kid.status === 'archived' && (
                    <div className="bg-red-500 text-white px-3 py-1 rounded-full text-[9px] font-black shadow-lg border border-white/20">
                        مفصول لحين مراجعة الإدارة
                    </div>
                )}
                {hasUnpaidFees && (
                    <div className="bg-orange-500 text-white px-3 py-1 rounded-full text-[9px] font-black shadow-lg border border-white/20">
                        لحين سداد الرسوم
                    </div>
                )}
            </div>

            <div className="flex flex-col items-center text-center space-y-4 relative z-10">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-[30px] flex items-center justify-center text-white shadow-xl shadow-blue-500/20 group-hover:rotate-6 transition-transform">
                    <UserIcon size={38} />
                </div>

                <div>
                    <h2 className="text-xl font-black text-gray-900 mb-1 group-hover:text-blue-600 transition-colors uppercase tracking-tight">{kid.fullName}</h2>
                    <div className="flex items-center justify-center flex-wrap gap-2 text-[10px] font-bold">
                        <div className="flex items-center gap-1.5 text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-100">
                            <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                            {group?.name || "بدون مجموعة"}
                        </div>
                        {teacher && (
                            <span className="text-gray-400 text-[9px]">بإشراف أ/ {teacher.fullName}</span>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 w-full pt-4">
                    <div className="bg-gray-50/80 p-4 rounded-3xl border border-gray-100 group-hover:bg-white group-hover:shadow-inner transition-all">
                        <p className="text-[10px] text-gray-400 font-black mb-1">الحضور</p>
                        <div className="flex items-baseline justify-center gap-1">
                            <span className="text-xl font-black text-gray-900">{presentCount}</span>
                            <span className="text-[10px] text-gray-400 font-bold">/ {totalAttendance || 0}</span>
                        </div>
                    </div>
                    <div className="bg-gray-50/80 p-4 rounded-3xl border border-gray-100 group-hover:bg-white group-hover:shadow-inner transition-all">
                        <p className="text-[10px] text-gray-400 font-black mb-1">الاختبارات</p>
                        <div className="flex items-baseline justify-center gap-1">
                            <span className="text-xl font-black text-gray-900">{exams.length}</span>
                            <span className="text-[10px] text-gray-400 font-bold">سجلات</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full pt-2">
                    <div className="flex-1 h-12 bg-blue-600 text-white shadow-lg shadow-blue-500/20 text-sm font-black rounded-2xl flex items-center justify-center gap-2 hover:bg-blue-700 transition-all">
                        عرض التفاصيل
                        <ChevronLeft size={16} />
                    </div>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onLeaveRequest();
                        }}
                        className="h-12 w-28 bg-orange-50 text-orange-600 text-xs font-black rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all hover:bg-orange-600 hover:text-white border border-orange-100"
                    >
                        <Calendar size={14} />
                        إجازة
                    </button>
                </div>
            </div>
        </motion.div>
    );
}
