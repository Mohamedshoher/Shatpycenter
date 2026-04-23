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
import { PresenceTracker } from "@/components/PresenceTracker";
import { useChatStore } from "@/store/useChatStore";
import { playNotificationSound } from "@/lib/notificationSound";
import { chatService } from "@/features/chat/services/chatService";
import { useEffect, useRef } from "react";

export default function ParentDashboard() {
    const { user, setUser } = useAuthStore();
    const router = useRouter();
    const { data: students, isLoading } = useStudents();
    const { data: groups } = useGroups();
    const { unreadCount, setConversations } = useChatStore();
    const [selectedKidForLeave, setSelectedKidForLeave] = useState<any>(null);
    const [selectedKidForDetail, setSelectedKidForDetail] = useState<any>(null);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [showPulse, setShowPulse] = useState(false);
    const prevUnreadCount = useRef(0);
    const { data: teachers } = useTeachers();

    const parentPhone = user?.displayName || "";
    const myKids = students?.filter(s => s.parentPhone === parentPhone) || [];

    // ✨ الاستماع للمحادثات وتحديث العداد
    useEffect(() => {
        if (!user?.uid) return;
        const userId = user.uid.replace('mock-', '');
        const unsubscribe = chatService.subscribeToConversations(userId, (conversations) => {
            setConversations(conversations);
        });
        return () => unsubscribe();
    }, [user?.uid, setConversations]);

    // ✨ تشغيل الصوت والتأثير عند وصول رسالة جديدة
    useEffect(() => {
        if (unreadCount > prevUnreadCount.current && prevUnreadCount.current >= 0) {
            playNotificationSound();
            setShowPulse(true);
            setTimeout(() => setShowPulse(false), 2000);
        }
        prevUnreadCount.current = unreadCount;
    }, [unreadCount]);

    // تصفية جهات الاتصال المسموح بالتواصل معها (المدير والمشرف ومدرسي الأبناء فقط)
    const allowedContacts = teachers?.filter(t => {
        // 1. المدير والمشرف متاحون دائماً
        if (t.role === 'supervisor') return true;
        // 2. مدرسو المجموعات التي ينتمي إليها الأبناء
        const kidTeacherIds = myKids.map(k => k.groupId).map(gid => groups?.find(g => g.id === gid)?.teacherId);
        if (kidTeacherIds.includes(t.id)) return true;
        return false;
    }) || [];

    // إضافة المدير كجهة اتصال يدوية (بافتراض وجود مدير عام للنظام)
    const contacts = [
        { id: 'director', fullName: 'المدير العام', role: 'director' },
        ...allowedContacts
    ];

    // دالة تسجيل الخروج ومسح بيانات الجلسة
    const handleLogout = async () => {
        await logout();
        setUser(null);
        router.push("/login");
    };

    // حالة التحميل الأولية
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50/50 font-sans pb-32" dir="rtl">
            <PresenceTracker />
            {/* رأس الصفحة الثابت - مرن مع الحاوية */}
            <header className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 h-16 flex items-center justify-between relative">
                    {/* الجانب الأيمن: زر تسجيل الخروج */}
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 rounded-2xl text-[11px] md:text-xs font-black hover:bg-red-600 hover:text-white transition-all shadow-sm active:scale-95 shrink-0"
                    >
                        <LogOut size={16} />
                        <span className="hidden xs:inline">تسجيل خروج</span>
                    </button>

                    {/* المنتصف: شعار المركز */}
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                        <div className="bg-white w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center shadow-lg border border-gray-50">
                            <img src="/icon-192.png" alt="شعار المركز" className="w-8 h-8 md:w-10 md:h-10 object-contain" />
                        </div>
                    </div>

                    {/* الجانب الأيسر: أزرار التنقل السريع */}
                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            onClick={() => setIsChatOpen(true)}
                            className={cn(
                                "relative flex items-center gap-2 px-4 py-2.5 bg-indigo-50 text-indigo-600 rounded-2xl text-[11px] md:text-xs font-black hover:bg-indigo-600 hover:text-white transition-all active:scale-95",
                                showPulse && "animate-bounce"
                            )}
                        >
                            <MessageCircle size={16} />
                            <span className="hidden sm:inline">المراسلة</span>
                            {unreadCount > 0 && (
                                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] flex items-center justify-center rounded-full border-2 border-white animate-pulse">
                                    {unreadCount > 9 ? '+9' : unreadCount}
                                </span>
                            )}
                        </button>
                        <button className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 text-blue-600 rounded-2xl text-[11px] md:text-xs font-black hover:bg-blue-600 hover:text-white transition-all active:scale-95">
                            <Home size={16} />
                            <span className="hidden sm:inline">الرئيسية</span>
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-8 md:py-12">
                {/* قسم رسالة الترحيب بولي الأمر - خطوط مرنة */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-12 md:mb-16 text-center sm:text-right"
                >
                    <h2 className="text-3xl md:text-5xl lg:text-6xl font-black text-gray-900 leading-tight">
                        {myKids.length > 0
                            ? `مرحباً ولي أمر ${myKids.map(k => k.fullName.split(' ')[0]).join(' و ')} 👋`
                            : "مرحباً بك ولي أمرنا العزيز 👋"}
                    </h2>
                    <p className="text-base md:text-xl text-gray-400 font-bold mt-4 max-w-2xl">
                        نسعد بمتابعتك المستمرة لرحلة أبنائك التعليمية في مركز الشاطبي وتطورهم في حفظ القرآن الكريم.
                    </p>
                </motion.div>

                {/* عنوان القسم والشبكة المرنة */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3 border-r-4 border-teal-500 pr-4">
                        <h1 className="text-xl md:text-2xl font-black text-gray-700 uppercase tracking-wide">أبنائي الطلاب</h1>
                        <span className="bg-teal-50 text-teal-600 px-3 py-1 rounded-full text-xs font-black">
                            {myKids.length} سجلات
                        </span>
                    </div>
                </div>

                {/* شبكة توزيع البطاقات: عمود في الهاتف، عمودين في التابلت، 3 في الكمبيوتر */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
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

                    {/* حالة عدم وجود طلاب */}
                    {myKids.length === 0 && (
                        <div className="col-span-full py-24 text-center space-y-6">
                            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto text-gray-400 shadow-inner">
                                <AlertCircle size={48} />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-gray-600">عذراً، لا توجد بيانات</h3>
                                <p className="text-gray-400 mt-2">لم نجد طلاباً مرتبطين بهذا الرقم في قاعدة البيانات.</p>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* نافذة تفاصيل الطالب المنبثقة */}
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

            {/* نافذة طلب الإجازة المنبثقة */}
            <AnimatePresence>
                {selectedKidForLeave && (
                    <LeaveRequestModal
                        kid={selectedKidForLeave}
                        onClose={() => setSelectedKidForLeave(null)}
                    />
                )}
            </AnimatePresence>

            {/* نافذة المراسلة المنبثقة */}
            <AnimatePresence>
                {isChatOpen && (
                    <ParentChatModal
                        isOpen={isChatOpen}
                        onClose={() => setIsChatOpen(false)}
                        contacts={contacts}
                    />
                )}
            </AnimatePresence>

            {/* زر المراسلة الداخلية العائم */}
            <button
                onClick={() => setIsChatOpen(true)}
                className={cn(
                    "fixed bottom-10 left-6 w-16 h-16 bg-indigo-600 text-white rounded-full shadow-2xl flex items-center justify-center z-40 active:scale-90 transition-all hover:bg-indigo-700 hover:rotate-12",
                    showPulse && "animate-bounce shadow-indigo-500/50"
                )}
                title="المراسلة الداخلية"
            >
                <div className="relative">
                    <MessageCircle size={32} />
                    {unreadCount > 0 && (
                        <span className="absolute -top-2 -right-2 w-7 h-7 bg-red-500 text-white text-xs flex items-center justify-center rounded-full border-2 border-white font-black shadow-lg">
                            {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                    )}
                </div>
            </button>
        </div>
    );
}

/**
 * مكون منبثق لتقديم طلب إجازة
 */
function LeaveRequestModal({ kid, onClose }: { kid: any, onClose: () => void }) {
    const { addLeave } = useStudentRecords(kid.id);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [reason, setReason] = useState('');

    // معالجة إرسال الطلب
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
            console.error("خطأ أثناء إرسال طلب الإجازة:", err);
            // يتم التعامل مع الأخطاء برمجياً في خدمة السجلات لضمان تجربة مستخدم سلسة
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

/**
 * مكون بطاقة عرض الطالب المختصرة
 */
function StudentCard({ kid, groups, teachers, onSelect, onLeaveRequest }: { kid: any, groups: any[], teachers: any[], onSelect: () => void, onLeaveRequest: () => void }) {
    const { attendance, exams, fees } = useStudentRecords(kid.id);
    const group = groups.find(g => g.id === kid.groupId);
    const teacher = teachers.find(t => t.id === group?.teacherId);

    const presentCount = attendance.filter(a => a.status === 'present').length;
    const totalAttendance = attendance.length;

    // التحقق من وجود مصروفات غير مدفوعة
    const isIqra = group?.name?.includes('إقراء') || group?.name?.includes('اقراء');
    const hasUnpaidFees = fees.length === 0 && !isIqra;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={onSelect}
            className="bg-white rounded-3xl md:rounded-[40px] p-4 md:p-6 shadow-sm border border-gray-100 hover:shadow-2xl hover:shadow-blue-500/10 transition-all group relative overflow-hidden cursor-pointer active:scale-[0.98]"
        >
            {/* زخرفة خلفية للبطاقة */}
            <div className="absolute top-0 right-0 w-24 h-24 md:w-32 md:h-32 bg-blue-500/5 rounded-bl-[100px] -mr-10 -mt-10 group-hover:scale-110 transition-transform" />

            {/* علامات الحالة (مفصول / سداد رسوم) */}
            <div className="absolute top-4 md:top-6 left-4 md:left-6 z-10 flex flex-col gap-1 md:gap-2 items-end">
                {kid.status === 'archived' && (
                    <div className="bg-red-500 text-white px-2 md:px-3 py-1 rounded-full text-[8px] md:text-[9px] font-black shadow-lg border border-white/20">
                        مفصول لحين مراجعة الإدارة
                    </div>
                )}
                {hasUnpaidFees && (
                    <div className="bg-orange-500 text-white px-2 md:px-3 py-1 rounded-full text-[8px] md:text-[9px] font-black shadow-lg border border-white/20">
                        لحين سداد الرسوم
                    </div>
                )}
            </div>

            <div className="flex flex-col items-center text-center space-y-3 md:space-y-4 relative z-10">
                {/* أيقونة الطالب */}
                <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl md:rounded-[30px] flex items-center justify-center text-white shadow-xl shadow-blue-500/20 group-hover:rotate-6 transition-transform">
                    <UserIcon size={28} className="md:w-10 md:h-10" />
                </div>

                <div>
                    <h2 className="text-lg md:text-xl font-black text-gray-900 mb-1 group-hover:text-blue-600 transition-colors uppercase tracking-tight truncate max-w-[200px]">{kid.fullName}</h2>
                    <div className="flex items-center justify-center flex-wrap gap-1.5 md:gap-2 text-[9px] md:text-[10px] font-bold">
                        <div className="flex items-center gap-1 md:gap-1.5 text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-100">
                            <span className="w-1 md:w-1.5 h-1 md:h-1.5 rounded-full bg-teal-500" />
                            {group?.name || "بدون مجموعة"}
                        </div>
                        {teacher && (
                            <span className="text-gray-400 text-[8px] md:text-[9px]">بإشراف أ/ {teacher.fullName}</span>
                        )}
                    </div>
                </div>

                {/* إحصائيات سريعة (حضور واختبارات) */}
                <div className="grid grid-cols-2 gap-3 md:gap-4 w-full pt-2 md:pt-4">
                    <div className="bg-gray-50/80 p-3 md:p-4 rounded-2xl md:rounded-3xl border border-gray-100 group-hover:bg-white group-hover:shadow-inner transition-all">
                        <p className="text-[9px] md:text-[10px] text-gray-400 font-black mb-1">الحضور</p>
                        <div className="flex items-baseline justify-center gap-1">
                            <span className="text-lg md:text-xl font-black text-gray-900">{presentCount}</span>
                            <span className="text-[8px] md:text-[10px] text-gray-400 font-bold">/ {totalAttendance || 0}</span>
                        </div>
                    </div>
                    <div className="bg-gray-50/80 p-3 md:p-4 rounded-2xl md:rounded-3xl border border-gray-100 group-hover:bg-white group-hover:shadow-inner transition-all">
                        <p className="text-[9px] md:text-[10px] text-gray-400 font-black mb-1">الاختبارات</p>
                        <div className="flex items-baseline justify-center gap-1">
                            <span className="text-lg md:text-xl font-black text-gray-900">{exams.length}</span>
                            <span className="text-[8px] md:text-[10px] text-gray-400 font-bold">سجلات</span>
                        </div>
                    </div>
                </div>

                {/* أزرار الإجراءات السريعة */}
                <div className="flex items-center gap-2 md:gap-3 w-full pt-1 md:pt-2">
                    <div className="flex-1 h-11 md:h-12 bg-blue-600 text-white shadow-lg shadow-blue-500/20 text-xs md:text-sm font-black rounded-xl md:rounded-2xl flex items-center justify-center gap-1.5 md:gap-2 hover:bg-blue-700 transition-all">
                        التفاصيل
                        <ChevronLeft size={14} className="md:w-4 md:h-4" />
                    </div>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onLeaveRequest();
                        }}
                        className="h-11 md:h-12 w-24 md:w-28 bg-orange-50 text-orange-600 text-[10px] md:text-xs font-black rounded-xl md:rounded-2xl flex items-center justify-center gap-1.5 md:gap-2 active:scale-95 transition-all hover:bg-orange-600 hover:text-white border border-orange-100"
                    >
                        <Calendar size={12} className="md:w-3.5 md:h-3.5" />
                        إجازة
                    </button>
                </div>
            </div>
        </motion.div>
    );
}

