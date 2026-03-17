"use client";

import { Button } from '@/components/ui/button';
import { 
    CircleDollarSign, 
    Calendar, 
    ChevronRight, 
    ChevronLeft, 
    Coins, 
    Trash2, 
    AlertCircle 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';

// ==========================================================
// مكون تبويب التحصيل المالي (TeacherCollectionTab)
// ==========================================================
export const TeacherCollectionTab = ({
    teacher,
    isTeacher,
    updateMonth,
    selectedMonthRaw,
    amount,
    setAmount,
    notes,
    setNotes,
    handleCollectionSubmit,
    expectedExpenses,
    totalCollected,
    totalCollectedByManager,
    totalHandedOver,
    collectionHistoryMapped,
    setShowCollectedDetails,
    setShowManagerCollectedDetails,
    setShowDeficitDetails,
    realDeficit,
    unpaidStudents,
    handleDeleteFee
}: any) => {
    
    // أداة لإعادة تحديث البيانات عند الحاجة
    const queryClient = useQueryClient();

    return (
        <div className="space-y-6">
            {/* 1. اختيار الشهر - تصميم متجاوب للموبايل */}
            <div className="flex flex-row-reverse items-center justify-between bg-white p-2 md:p-4 rounded-2xl md:rounded-3xl border border-gray-100 shadow-sm gap-2">
                
                {/* زر الشهر السابق */}
                <button
                    onClick={() => updateMonth(-1)}
                    className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold border border-gray-100 text-gray-500 hover:bg-gray-50 transition-all shrink-0 h-10 md:h-auto"
                >
                    <ChevronRight size={16} />
                    <span className="hidden md:inline">الشهر السابق</span>
                </button>

                {/* عرض الشهر الحالي */}
                <div className="flex-1 flex justify-center w-full min-w-0 mx-1">
                    <div className="bg-gray-50 px-3 md:px-6 py-2 rounded-xl border border-gray-100 text-xs md:text-sm font-bold flex items-center justify-center gap-2 text-gray-700 relative w-full md:w-auto max-w-[200px]">
                        <span className="truncate" dir="ltr">{selectedMonthRaw}</span>
                        <Calendar size={16} className="text-teal-500 shrink-0" />
                        <input
                            type="month"
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                            value={selectedMonthRaw}
                            onChange={(e) => updateMonth(e.target.value)}
                        />
                    </div>
                </div>

                {/* زر الشهر التالي/الحالي */}
                <button
                    onClick={() => updateMonth(0)}
                    className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold border border-gray-100 text-gray-500 hover:bg-gray-50 transition-all shrink-0 h-10 md:h-auto"
                >
                    <span className="hidden md:inline">الشهر الحالي</span>
                    <ChevronLeft size={16} />
                </button>
            </div>

            {/* 2. نموذج إضافة تحصيل جديد - مخفي للمدرس */}
            {!isTeacher && (
                <div className="bg-white p-6 rounded-[32px] border-2 border-teal-500/10 shadow-sm space-y-4">
                    <div className="flex flex-row-reverse items-center gap-2 text-teal-600 mb-2">
                        <CircleDollarSign size={20} />
                        <h4 className="font-bold">تسجيل مبلغ محصل من المدرس</h4>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2 text-right">
                            <label className="text-xs font-bold text-gray-500 mr-1">المبلغ (ج.م)</label>
                            <input
                                type="number"
                                placeholder="مثلاً: 500"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="w-full h-12 bg-gray-50 border border-gray-100 rounded-2xl px-4 text-right focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all font-bold"
                            />
                        </div>
                        <div className="space-y-2 text-right">
                            <label className="text-xs font-bold text-gray-500 mr-1">ملاحظات (اختياري)</label>
                            <input
                                type="text"
                                placeholder="عن أي مجموعة أو طالب..."
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="w-full h-12 bg-gray-50 border border-gray-100 rounded-2xl px-4 text-right focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all"
                            />
                        </div>
                    </div>
                    <Button
                        onClick={handleCollectionSubmit}
                        className="w-full h-12 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl font-bold shadow-lg shadow-teal-600/20"
                    >
                        تسجيل التحصيل
                    </Button>
                </div>
            )}

            {/* 3. بطاقات الإحصائيات المالية */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
                {/* المصروفات المتوقعة */}
                <div className="bg-gradient-to-br from-indigo-50 to-white p-4 md:p-6 rounded-[32px] border border-indigo-100 shadow-sm flex flex-col items-center justify-center text-center group hover:scale-[1.02] transition-transform">
                    <p className="text-[10px] md:text-xs font-black text-indigo-400 mb-2 uppercase tracking-wide">إجمالي المصروفات المتوقعة</p>
                    <p className="text-xl md:text-3xl font-black text-indigo-700 font-sans">{expectedExpenses.toLocaleString()} <span className="text-xs md:text-sm">ج.م</span></p>
                </div>

                {/* ما حصله المدرس */}
                <div className="bg-gradient-to-br from-blue-50 to-white p-4 md:p-6 rounded-[32px] border border-blue-100 shadow-sm flex flex-col items-center justify-center text-center hover:scale-[1.02] transition-transform">
                    <p className="text-[10px] md:text-xs font-black text-blue-400 mb-2 uppercase tracking-wide">ما حصله المدرس</p>
                    <p className="text-xl md:text-3xl font-black text-blue-700 font-sans">{totalCollected.toLocaleString()} <span className="text-xs md:text-sm">ج.م</span></p>
                    <button onClick={() => setShowCollectedDetails(true)} className="mt-3 px-4 py-1.5 bg-blue-100/50 text-blue-600 rounded-full text-[10px] font-black hover:bg-blue-600 hover:text-white transition-all">كشف تفصيلي</button>
                </div>

                {/* المحصل من المدير */}
                <div className="bg-white p-4 md:p-6 rounded-[32px] border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center hover:scale-[1.02] transition-transform">
                    <p className="text-[10px] md:text-xs font-black text-slate-400 mb-2 uppercase tracking-wide">المحصل من المدير</p>
                    <p className="text-xl md:text-3xl font-black text-slate-800 font-sans">{totalCollectedByManager.toLocaleString()} <span className="text-xs md:text-sm">ج.م</span></p>
                    <button onClick={() => setShowManagerCollectedDetails(true)} className="mt-3 px-4 py-1.5 bg-slate-100 text-slate-600 rounded-full text-[10px] font-black hover:bg-slate-800 hover:text-white transition-all">عرض الطلاب</button>
                </div>

                {/* المسلم للمدير */}
                <div className="bg-gradient-to-br from-emerald-50 to-white p-4 md:p-6 rounded-[32px] border border-emerald-100 shadow-sm flex flex-col items-center justify-center text-center hover:scale-[1.02] transition-transform">
                    <p className="text-[10px] md:text-xs font-black text-emerald-400 mb-2 uppercase tracking-wide">المسلم للمدير</p>
                    <p className="text-xl md:text-3xl font-black text-emerald-700 font-sans">{totalHandedOver.toLocaleString()} <span className="text-xs md:text-sm">ج.م</span></p>
                    <div className="mt-3 w-10 h-1 bg-emerald-100 rounded-full" />
                </div>

                {/* عجز التسليم */}
                <div className="bg-gradient-to-br from-rose-50 to-white p-4 md:p-6 rounded-[32px] border border-rose-100 shadow-sm flex flex-col items-center justify-center text-center hover:scale-[1.02] transition-transform">
                    <p className="text-[10px] md:text-xs font-black text-rose-400 mb-2 uppercase tracking-wide">عجز التسليم (معه)</p>
                    <p className="text-xl md:text-3xl font-black text-rose-600 font-sans">{Math.max(0, totalCollected - totalHandedOver).toLocaleString()} <span className="text-xs md:text-sm">ج.م</span></p>
                    <div className="mt-3 flex items-center gap-1">
                        <AlertCircle size={10} className="text-rose-400" />
                        <span className="text-[9px] font-bold text-rose-400">عهدة طرف المدرس</span>
                    </div>
                </div>

                {/* عجز المجموعة الحقيقي */}
                <div
                    onClick={() => setShowDeficitDetails(true)}
                    className="bg-gradient-to-br from-amber-50 to-white p-4 md:p-6 rounded-[32px] border border-amber-100 shadow-sm flex flex-col items-center justify-center text-center cursor-pointer hover:scale-[1.02] transition-transform hover:border-amber-300 group"
                >
                    <p className="text-[10px] md:text-xs font-black text-amber-500 mb-2 uppercase tracking-wide">عجز المجموعة الحقيقي</p>
                    <p className="text-xl md:text-3xl font-black text-amber-600 font-sans">{realDeficit.toLocaleString()} <span className="text-xs md:text-sm">ج.م</span></p>
                    <div className="mt-3 flex flex-col items-center gap-1">
                        <span className="text-[9px] font-bold text-amber-500">{unpaidStudents.filter(s => !s.isExempted).length} طالب لم يدفع بعد</span>
                        <button className="px-3 py-1 bg-amber-100 text-amber-600 rounded-full text-[9px] font-black group-hover:bg-amber-500 group-hover:text-white transition-all">
                            عرض التفاصيل
                        </button>
                    </div>
                </div>
            </div>

            {/* 4. تاريخ عمليات التسليم */}
            <div className="space-y-4">
                <h4 className="font-bold text-slate-800 text-right pr-2 text-lg">تاريخ عمليات التسليم</h4>
                {collectionHistoryMapped.length === 0 ? (
                    <div className="bg-white/40 rounded-[32px] border-2 border-dashed border-slate-100 py-12 text-center text-slate-400 text-sm font-bold">
                        لا توجد عمليات مسجلة لقسم التحصيل.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {collectionHistoryMapped.map((record: any) => (
                            <div key={record.id} className="bg-white p-5 rounded-[28px] border border-slate-50 shadow-sm hover:border-teal-100 transition-all group">
                                <div className="flex flex-row-reverse items-start justify-between">
                                    <div className="flex flex-row-reverse items-center gap-3">
                                        <div className="w-10 h-10 bg-teal-50 rounded-2xl flex items-center justify-center text-teal-600">
                                            <Coins size={20} />
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-black text-slate-900 font-sans">{Number(record.amount).toLocaleString()} ج.م</p>
                                            <p className="text-[10px] font-bold text-slate-400 mt-0.5">{record.date}</p>
                                        </div>
                                    </div>
                                    {!isTeacher && (
                                        <button
                                            onClick={async () => {
                                                if (confirm('هل أنت متأكد من حذف هذه العملية؟')) {
                                                    const { deleteTransaction } = await import('@/features/finance/services/financeService');
                                                    await deleteTransaction(record.id);
                                                    queryClient.invalidateQueries({ queryKey: ['handovers', teacher?.id, selectedMonthRaw] });
                                                }
                                            }}
                                            className="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>
                                <div className="mt-4 pt-3 border-t border-slate-50 flex flex-row-reverse items-center justify-between">
                                    <div className="bg-slate-50 px-3 py-1 rounded-full text-[9px] font-bold text-slate-500">{record.type}</div>
                                    <p className="text-[10px] font-bold text-slate-400 truncate max-w-[150px]">{record.notes}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};