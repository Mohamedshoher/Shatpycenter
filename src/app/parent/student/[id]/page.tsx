"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useMemo } from "react";
import { useStudents } from "@/features/students/hooks/useStudents";
import { useGroups } from "@/features/groups/hooks/useGroups";
import { useTeachers } from "@/features/teachers/hooks/useTeachers";
import { useStudentRecords } from "@/features/students/hooks/useStudentRecords";
import {
    ChevronRight,
    Home,
    Calendar,
    CreditCard,
    BookOpen,
    TrendingUp,
    CheckCircle2,
    XCircle,
    MessageCircle,
    Info
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

type TabType = "exams" | "fees" | "attendance" | "plan";

export default function StudentDetailParentPage() {
    const { id } = useParams();
    const router = useRouter();
    const { data: students, isLoading: studentsLoading } = useStudents();
    const { data: groups } = useGroups();
    const { data: teachers } = useTeachers();

    const [activeTab, setActiveTab] = useState<TabType>("attendance");
    const [activeExamSubTab, setActiveExamSubTab] = useState("ماضي قريب");
    const {
        attendance,
        exams,
        fees,
        plans,
        isLoadingAttendance,
        isLoadingExams,
        isLoadingFees,
        isLoadingPlans
    } = useStudentRecords(id as string);

    const student = students?.find(s => s.id === id);
    const group = groups?.find(g => g.id === student?.groupId);
    const teacher = teachers?.find(t => t.id === group?.teacherId);

    if (studentsLoading || isLoadingAttendance || isLoadingExams || isLoadingFees || isLoadingPlans) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
            </div>
        );
    }

    if (!student) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-white p-6 text-center">
                <Info size={48} className="text-gray-300 mb-4" />
                <h2 className="text-xl font-bold text-gray-900">الطالب غير موجود</h2>
                <button onClick={() => router.push("/parent")} className="mt-4 text-teal-600 font-bold underline">العودة للرئيسية</button>
            </div>
        );
    }

    const renderHeader = () => (
        <div className="bg-white px-4 pt-6 pb-4 sticky top-0 z-50">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => router.push("/parent")}
                        className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 active:scale-95 transition-all"
                    >
                        <ChevronRight size={24} />
                    </button>
                    <button
                        onClick={() => router.push("/parent")}
                        className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 active:scale-95 transition-all"
                    >
                        <Home size={20} />
                    </button>
                </div>
            </div>

            <div className="text-center md:text-right space-y-2">
                <h1 className="text-2xl font-black text-gray-900">{student.fullName}</h1>
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                    <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-[10px] font-black border border-blue-100">
                        {group?.name || "بدون مجموعة"}
                    </span>
                    {teacher && (
                        <div className="flex items-center gap-1 bg-teal-50 text-teal-700 px-3 py-1 rounded-full text-[10px] font-black border border-teal-100">
                            <span className="w-2 h-2 rounded-full bg-teal-500" />
                            أ/ {teacher.fullName}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    const renderTabs = () => {
        const tabs: { id: TabType, label: string, icon: any }[] = [
            { id: "exams", label: "الاختبارات", icon: BookOpen },
            { id: "fees", label: "المصروفات", icon: CreditCard },
            { id: "attendance", label: "الحضور", icon: Calendar },
            { id: "plan", label: "الخطة", icon: TrendingUp },
        ];

        return (
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-2 py-3 z-50 flex justify-around items-center">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                "flex flex-col items-center gap-1 min-w-[64px] transition-all",
                                isActive ? "text-teal-600" : "text-gray-400"
                            )}
                        >
                            <div className={cn(
                                "w-10 h-10 rounded-2xl flex items-center justify-center transition-all",
                                isActive ? "bg-teal-50" : "bg-transparent"
                            )}>
                                <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                            </div>
                            <span className="text-[10px] font-black">{tab.label}</span>
                        </button>
                    );
                })}
            </div>
        );
    };

    const renderAttendance = () => {
        const presentCount = attendance.filter(a => a.status === 'present').length;
        const absentCount = attendance.filter(a => a.status === 'absent').length;

        return (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h3 className="text-lg font-black text-gray-900 px-4">بيانات الحصص</h3>

                {/* إحصائيات علوية */}
                <div className="grid grid-cols-2 gap-4 px-4">
                    <div className="bg-green-50/50 p-6 rounded-[32px] border border-green-100 flex flex-col items-center justify-center text-center space-y-1">
                        <p className="text-xs font-bold text-green-600 flex items-center gap-1">
                            <CheckCircle2 size={14} />
                            حضور
                        </p>
                        <p className="text-4xl font-black text-green-700">{presentCount}</p>
                    </div>
                    <div className="bg-red-50/50 p-6 rounded-[32px] border border-red-100 flex flex-col items-center justify-center text-center space-y-1">
                        <p className="text-xs font-bold text-red-600 flex items-center gap-1">
                            <XCircle size={14} />
                            غياب
                        </p>
                        <p className="text-4xl font-black text-red-700">{absentCount}</p>
                    </div>
                </div>

                {/* قائمة الحصص */}
                <div className="space-y-3 px-4 pb-20">
                    {attendance.sort((a, b) => b.day - a.day).map((item, idx) => (
                        <div key={idx} className="bg-white p-4 rounded-3xl border border-gray-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className={cn(
                                    "w-10 h-10 rounded-2xl flex items-center justify-center",
                                    item.status === "present" ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
                                )}>
                                    {item.status === "present" ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                                </div>
                                <span className="text-sm font-black text-gray-700">{item.day} {item.month === '2026-01' ? 'يناير 2026' : item.month}</span>
                            </div>
                            <span className={cn(
                                "text-[10px] font-black px-3 py-1 rounded-full",
                                item.status === "present" ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
                            )}>
                                {item.status === "present" ? "حاضر" : "غائب"}
                            </span>
                        </div>
                    ))}
                    {attendance.length === 0 && (
                        <div className="text-center py-10 text-gray-400 text-xs font-bold">لا يوجد سجل حضور مسجل حالياً</div>
                    )}
                </div>
            </div>
        );
    };

    const renderFees = () => (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between px-4">
                <h3 className="text-lg font-black text-gray-900">حالة المصروفات</h3>
                <span className="bg-blue-600 text-white px-4 py-1.5 rounded-full text-[10px] font-black">الرسوم: {student.monthlyAmount || 80} جنيه</span>
            </div>

            <div className="px-4 pb-20 space-y-4">
                {fees.map((fee, idx) => (
                    <div key={idx} className="bg-white rounded-[40px] border border-gray-100 p-6 space-y-6 relative overflow-hidden">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                                    <CreditCard size={24} />
                                </div>
                                <span className="text-lg font-black text-gray-900">{fee.month}</span>
                            </div>
                            <span className={cn(
                                "text-[10px] font-black px-3 py-1.5 rounded-full",
                                "bg-green-50 text-green-600"
                            )}>
                                تم السداد ✓
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-gray-50/50 p-4 rounded-3xl border border-gray-100 text-center space-y-1">
                                <p className="text-[10px] text-gray-400 font-bold">المبلغ المطلوب</p>
                                <p className="text-lg font-black text-gray-900">{student.monthlyAmount} ج.م</p>
                            </div>
                            <div className="bg-white p-4 rounded-3xl border-2 border-green-50 text-center space-y-1">
                                <p className="text-[10px] text-green-400 font-bold">تم دفع</p>
                                <p className="text-lg font-black text-green-600">{fee.amount}</p>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-gray-50 space-y-1">
                            <div className="flex justify-between text-[10px] font-bold">
                                <span className="text-gray-400">تاريخ السداد:</span>
                                <span className="text-gray-700">{fee.date}</span>
                            </div>
                            <div className="flex justify-between text-[10px] font-bold">
                                <span className="text-gray-400">رقم الإيصال:</span>
                                <span className="text-gray-700">#{fee.receipt}</span>
                            </div>
                            <div className="flex justify-between text-[10px] font-bold">
                                <span className="text-gray-400">المحصل:</span>
                                <span className="text-gray-700">{fee.createdBy}</span>
                            </div>
                        </div>
                    </div>
                ))}
                {fees.length === 0 && (
                    <div className="text-center py-10 text-gray-400 text-xs font-bold">لم يتم تسجيل أي مصروفات لهذا الطالب</div>
                )}
            </div>
        </div>
    );



    const renderExams = () => {
        const filteredExams = exams.filter(e => e.type === activeExamSubTab);

        return (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between px-4">
                    <h3 className="text-lg font-black text-gray-900">سجل الاختبارات</h3>
                    <span className="text-xs font-black text-gray-400">{filteredExams.length} إجمالي</span>
                </div>

                <div className="px-4">
                    <div className="bg-white rounded-3xl border border-blue-50 p-2 flex gap-2 relative">
                        {["جديد", "ماضي قريب", "ماضي بعيد"].map((t) => (
                            <button
                                key={t}
                                onClick={() => setActiveExamSubTab(t)}
                                className={cn(
                                    "flex-1 py-3 px-2 rounded-2xl text-[10px] font-black transition-all relative z-10",
                                    activeExamSubTab === t ? "text-white" : "text-gray-400 hover:bg-gray-50"
                                )}
                            >
                                <span className="relative z-20">{t}</span>
                                {activeExamSubTab === t && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="absolute inset-0 bg-blue-600 rounded-2xl z-10"
                                    />
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="px-4 pb-20 space-y-4">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeExamSubTab}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3 }}
                            className="space-y-4"
                        >
                            <div className="bg-white rounded-[32px] border border-gray-100 p-6 space-y-4">
                                <div className="flex items-center gap-2 text-teal-600 mb-2">
                                    <TrendingUp size={18} />
                                    <h4 className="text-sm font-black">مستوى الطالب في آخر 10 اختبارات</h4>
                                </div>
                                {/* Placeholder for chart */}
                                <div className="h-40 w-full bg-gray-50/50 rounded-2xl border border-dashed border-gray-200 flex flex-col items-center justify-center text-center p-4">
                                    <p className="text-[10px] text-gray-400 font-bold mb-2">الرسم البياني لمستوى التقدم - {activeExamSubTab}</p>
                                    <div className="flex items-end gap-2 h-20 w-full justify-around px-4">
                                        {[40, 70, 55, 90, 85, 100].map((h, i) => (
                                            <motion.div
                                                key={i}
                                                initial={{ height: 0 }}
                                                animate={{ height: `${h}%` }}
                                                className="w-4 bg-teal-500/20 rounded-t-lg relative"
                                            >
                                                {h > 90 && <div className="absolute top-0 left-0 right-0 h-2 bg-teal-500 rounded-t-lg" />}
                                            </motion.div>
                                        ))}
                                    </div>
                                    <div className="flex justify-between w-full mt-2 px-2 text-[8px] font-bold text-gray-300">
                                        <span>الأحد</span>
                                        <span>الخميس</span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                {filteredExams.map((exam, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.05 }}
                                        className="bg-white p-5 rounded-3xl border border-gray-50 shadow-sm flex items-center justify-between"
                                    >
                                        <div className="space-y-1">
                                            <h5 className="text-sm font-black text-gray-900">{exam.surah}</h5>
                                            <p className="text-[10px] text-gray-400 font-bold">{exam.date}</p>
                                        </div>
                                        <span className={cn(
                                            "px-3 py-1.5 rounded-full text-[10px] font-black",
                                            exam.grade === "ممتاز" ? "bg-green-50 text-green-600" : "bg-blue-50 text-blue-600"
                                        )}>
                                            {exam.grade}
                                        </span>
                                    </motion.div>
                                ))}
                                {filteredExams.length === 0 && (
                                    <div className="text-center py-10 text-gray-400 text-xs font-bold">لا توجد اختبارات مسجلة في هذا القسم</div>
                                )}
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
        );
    };

    const renderPlan = () => (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl mx-auto px-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-black text-gray-900">الخطة والمتابعة اليومية</h3>
                <span className="text-xs font-black text-gray-400">{plans.length} سجل</span>
            </div>

            <div className="space-y-4 pb-20">
                {plans.map((p, idx) => (
                    <motion.div
                        key={p.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="bg-white rounded-[32px] border border-gray-100 p-6 shadow-sm space-y-4 relative overflow-hidden"
                    >
                        <div className="flex items-center justify-between pb-4 border-b border-gray-50">
                            <span className="text-xs font-black text-teal-600 bg-teal-50 px-3 py-1.5 rounded-xl">{p.date}</span>
                            <span className={cn(
                                "text-[10px] font-black px-3 py-1.5 rounded-xl",
                                p.status === 'completed' ? "bg-green-50 text-green-600" :
                                    p.status === 'partial' ? "bg-orange-50 text-orange-600" : "bg-red-50 text-red-600"
                            )}>
                                {p.status === 'completed' ? "تم الإنجاز ✓" :
                                    p.status === 'partial' ? "إنجاز جزئي !" : "لم يتم الحفظ بعد"}
                            </span>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                            <div className="flex flex-col gap-1 p-3 bg-blue-50/50 rounded-2xl border border-blue-50">
                                <span className="text-[10px] font-black text-blue-400">الحفظ الجديد:</span>
                                <span className="text-sm font-black text-gray-900">{p.newHifz || '—'}</span>
                            </div>
                            <div className="flex flex-col gap-1 p-3 bg-teal-50/50 rounded-2xl border border-teal-50">
                                <span className="text-[10px] font-black text-teal-400">مراجعة قريبة:</span>
                                <span className="text-sm font-black text-gray-900">{p.prevReview || '—'}</span>
                            </div>
                            <div className="flex flex-col gap-1 p-3 bg-orange-50/50 rounded-2xl border border-orange-50">
                                <span className="text-[10px] font-black text-orange-400">مراجعة بعيدة:</span>
                                <span className="text-sm font-black text-gray-900">{p.distantReview || '—'}</span>
                            </div>
                        </div>

                        {p.notes && (
                            <div className="pt-2 flex items-start gap-2 text-gray-500">
                                <Info size={14} className="mt-0.5" />
                                <p className="text-[10px] font-bold leading-relaxed">{p.notes}</p>
                            </div>
                        )}
                    </motion.div>
                ))}

                {plans.length === 0 && (
                    <div className="text-center py-20 bg-white rounded-[40px] border border-dashed border-gray-200">
                        <TrendingUp size={48} className="mx-auto text-gray-200 mb-4" />
                        <p className="text-sm font-black text-gray-400">لا يوجد سجل متابعة بعد</p>
                        <p className="text-xs text-gray-300">سيظهر الحفظ والمراجعة هنا يومياً</p>
                    </div>
                )}
            </div>
        </div>
    );

    const renderContent = () => {
        switch (activeTab) {
            case "attendance": return renderAttendance();
            case "fees": return renderFees();
            case "exams": return renderExams();
            case "plan": return renderPlan();
        }
    };

    return (
        <div className="min-h-screen bg-gray-50/30 font-sans pb-24" dir="rtl">
            {renderHeader()}

            <main className="max-w-4xl mx-auto py-4">
                {renderContent()}
            </main>

            {renderTabs()}

            {/* WhatsApp Floating Button for Center Support */}
            <button
                onClick={() => window.open('https://wa.me/201234567890', '_blank')}
                className="fixed bottom-24 left-6 w-14 h-14 bg-teal-600 text-white rounded-full shadow-2xl flex items-center justify-center z-40 active:scale-90 transition-all hover:bg-teal-700"
            >
                <MessageCircle size={28} />
            </button>
        </div>
    );
}
