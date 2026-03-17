"use client";

import { Calendar, CircleDollarSign, MessageCircle, Trash2, Loader, ChevronRight, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
interface TeacherPayrollTabProps {
    selectedMonth: string;
    selectedMonthRaw: string;
    updateMonth: (val: number | string) => void;
    basicSalary: number;
    autoRewards: number;
    manualRewardsTotal: number;
    autoDeductions: number;
    manualDeductionsTotal: number;
    totalPaid: number;
    totalEntitlement: number;
    remainingToPay: number;
    isTeacher: boolean;
    paymentsHistory: any[];
    handlePaySalary: (amount: number, description: string) => void;
    handleSendReport: () => void;
    deleteSalaryMutation: any;
    isSettlementMode: boolean; // إضافة هنا
    setIsSettlementMode: (val: boolean) => void; // إضافة هنا
}

export const TeacherPayrollTab = ({
    selectedMonth,
    selectedMonthRaw,
    updateMonth,
    basicSalary,
    autoRewards,
    manualRewardsTotal,
    autoDeductions,
    manualDeductionsTotal,
    totalPaid,
    totalEntitlement,
    remainingToPay,
    isTeacher,
    paymentsHistory,
    handlePaySalary,
    handleSendReport,
    deleteSalaryMutation,
    isSettlementMode,
    setIsSettlementMode
}: TeacherPayrollTabProps) => {

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-10">
            {/* اختيار الشهر في تبويب الراتب - متجاوب */}
            <div className="flex flex-row-reverse items-center justify-between bg-white p-2 md:p-4 rounded-2xl md:rounded-3xl border border-gray-100 shadow-sm gap-2">
                {/* زر السابق */}
                <button
                    onClick={() => updateMonth(-1)}
                    className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold border border-gray-100 text-gray-500 hover:bg-gray-50 transition-all shrink-0 h-10 md:h-auto"
                >
                    <ChevronRight size={16} />
                    <span className="hidden md:inline">الشهر السابق</span>
                </button>

                {/* الشهر */}
                <div className="flex-1 flex justify-center w-full min-w-0 mx-1">
                    <div className="bg-gray-50 px-3 md:px-6 py-2 rounded-xl border border-gray-100 text-xs md:text-sm font-bold flex items-center justify-center gap-2 text-gray-700 relative w-full md:w-auto max-w-[200px]">
                        <span className="truncate" dir="ltr">{selectedMonthRaw}</span>
                        <Calendar size={14} className="md:w-4 md:h-4 text-gray-400 shrink-0" />
                        <input
                            type="month"
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                            value={selectedMonthRaw}
                            onChange={(e) => updateMonth(e.target.value)}
                        />
                    </div>
                </div>

                {/* زر الحالي */}
                <button
                    onClick={() => {
                        const today = new Date();
                        const monthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
                        updateMonth(monthStr);
                    }}
                    className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold border border-gray-100 text-gray-500 hover:bg-gray-50 transition-all shrink-0 h-10 md:h-auto"
                >
                    <span className="hidden md:inline">الشهر الحالي</span>
                    <ChevronLeft size={16} />
                </button>

                {/* زر التصفية الحالية */}
                {!isTeacher && (
                    <button
                        onClick={() => setIsSettlementMode(!isSettlementMode)}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all h-10 md:h-auto border",
                            isSettlementMode
                                ? "bg-red-600 text-white border-red-700 shadow-lg shadow-red-200"
                                : "bg-teal-50 text-teal-700 border-teal-100 hover:bg-teal-100"
                        )}
                    >
                        <CircleDollarSign size={14} />
                        {isSettlementMode ? "إلغاء التصفية" : "تصفية حساب حالية"}
                    </button>
                )}
            </div>

            {/* بطاقة الراتب والمستحقات (كرت المحاسبة الرئيسي) */}
            <div className="bg-white rounded-[32px] md:rounded-[48px] border border-gray-100 p-4 md:p-8 shadow-sm space-y-6 md:space-y-8 overflow-hidden relative">
                {/* أيقونة خلفية جمالية */}
                <CircleDollarSign size={200} className="absolute -left-10 -bottom-10 text-gray-50/50 -rotate-12 pointer-events-none opacity-20 md:opacity-100" />

                <div className="flex flex-row-reverse items-start justify-between relative z-10">
                    <div className="text-right">
                        <h3 className="text-xl md:text-2xl font-black text-gray-900 leading-tight"> الراتب </h3>
                        <p className="text-gray-400 font-bold text-xs md:text-sm">شهر {selectedMonth}</p>
                    </div>
                    <div className="bg-orange-50 px-3 py-1.5 md:px-4 md:py-2 rounded-full border border-orange-100 flex items-center gap-2 text-[8px] md:text-[10px] font-black text-orange-600">
                        <span>حالة الصرف:</span>
                        <span>قيد الانتظار ⌛</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6 relative z-10">
                    {/* عرض صافي المستحق والمتبقي */}
                    <div className="md:col-span-4 flex flex-col gap-3 md:gap-4 font-sans">
                        <div className="bg-gray-50/80 p-4 md:p-6 rounded-[24px] md:rounded-[32px] border border-gray-100 text-center space-y-1 md:space-y-2 backdrop-blur-sm">
                            <p className="text-[10px] md:text-xs font-bold text-gray-400">إجمالي الاستحقاق</p>
                            <p className="text-2xl md:text-4xl font-black text-gray-900 tracking-tight">{totalEntitlement.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        </div>
                        <div className="bg-teal-600 p-4 md:p-6 rounded-[24px] md:rounded-[32px] text-center space-y-1 md:space-y-2 shadow-xl shadow-teal-600/30 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                                <CircleDollarSign size={60} className="md:w-20 md:h-20" />
                            </div>
                            <p className="text-[10px] md:text-xs font-bold text-teal-100/80 relative z-10">المتبقي للصرف</p>
                            <p className="text-2xl md:text-4xl font-black text-white tracking-tight relative z-10">{remainingToPay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                            <p className="text-[8px] md:text-[10px] font-black text-teal-200/60 uppercase tracking-widest relative z-10">EGYPTIAN POUND</p>
                        </div>
                    </div>

                    {/* تفاصيل بنود الحساب (أساسي، حوافز، استقطاعات) */}
                    <div className="md:col-span-8 flex flex-col gap-3">
                        <div className="flex flex-row-reverse items-center justify-between p-4 md:p-5 bg-gray-50/30 rounded-[20px] md:rounded-[24px] border border-gray-50 hover:bg-gray-50 transition-colors">
                            <span className="text-xs md:text-sm font-bold text-gray-500">الراتب الأساسي/الشراكة:</span>
                            <span className="text-sm md:text-lg font-black font-sans text-gray-900">{basicSalary.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م</span>
                        </div>
                        <div className="flex flex-row-reverse items-center justify-between p-4 md:p-5 bg-green-50/30 rounded-[20px] md:rounded-[24px] border border-green-50 hover:bg-green-50 transition-colors">
                            <div className="text-right">
                                <p className="text-xs md:text-sm font-bold text-green-700">مكافآت وحوافز:</p>
                                <p className="text-[8px] md:text-[9px] font-bold text-green-600/60 leading-none mt-1">(حضور + يدوي)</p>
                            </div>
                            <span className="text-sm md:text-lg font-black font-sans text-green-600">+{(autoRewards + manualRewardsTotal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م</span>
                        </div>
                        <div className="flex flex-row-reverse items-center justify-between p-4 md:p-5 bg-red-50/30 rounded-[20px] md:rounded-[24px] border border-red-50 hover:bg-red-50 transition-colors">
                            <div className="text-right">
                                <p className="text-xs md:text-sm font-bold text-red-700">خصومات واستقطاعات:</p>
                                <p className="text-[8px] md:text-[9px] font-bold text-red-600/60 leading-none mt-1">(غياب + يدوي)</p>
                            </div>
                            <span className="text-sm md:text-lg font-black font-sans text-red-600">-{(autoDeductions + manualDeductionsTotal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م</span>
                        </div>
                        <div className="flex flex-row-reverse items-center justify-between p-4 md:p-5 bg-purple-50/30 rounded-[20px] md:rounded-[24px] border border-purple-50 hover:bg-purple-50 transition-colors">
                            <span className="text-xs md:text-sm font-bold text-purple-700">تم صرفه للمدرس:</span>
                            <span className="text-sm md:text-lg font-black font-sans text-purple-600">-{totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م</span>
                        </div>
                    </div>
                </div>

                {/* تنبيه وضع التصفية */}
                {isSettlementMode && (
                    <div className="bg-amber-50 border border-amber-200 p-4 rounded-3xl flex flex-row-reverse items-center gap-3 animate-pulse">
                        <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 shrink-0">
                            <Calendar size={20} />
                        </div>
                        <div className="text-right">
                            <h5 className="text-xs font-black text-amber-800">وضع التصفية النشط</h5>
                            <p className="text-[10px] font-bold text-amber-600">يتم الآن حساب الراتب الأساسي بناءً على أيام العمل المنقضية فقط من الشهر الحالي.</p>
                        </div>
                    </div>
                )}

                {/* سجل الدفعات النقدية المصروفة لهذا الشهر */}
                <div className="space-y-4 pt-4 border-t border-gray-50 relative z-10">
                    <div className="flex flex-col md:flex-row-reverse items-center justify-between gap-3">
                        <h4 className="text-lg font-black text-gray-800">سجل صرف الراتب</h4>
                        {!isTeacher && (
                            <div className="flex flex-wrap items-center justify-center gap-2">
                                <button
                                    onClick={() => {
                                        const amountStr = prompt('أدخل المبلغ المسلم للمدرس:');
                                        if (amountStr) {
                                            const amount = parseFloat(amountStr);
                                            if (!isNaN(amount)) handlePaySalary(amount, 'مصروف راتب (يدوي)');
                                        }
                                    }}
                                    className="px-3 py-2 bg-blue-50 text-blue-600 rounded-xl text-[10px] font-bold border border-blue-100 hover:bg-blue-100 transition-all"
                                >
                                    + مصروف راتب (يدوي)
                                </button>
                            </div>
                        )}
                    </div>
                    <div className="bg-gray-50/50 rounded-2xl border border-dashed border-gray-200 p-4 md:p-8 text-center">
                        {paymentsHistory.length === 0 ? (
                            <p className="text-gray-400 text-sm font-bold">لا توجد دفعات مسجلة لهذا الشهر.</p>
                        ) : (
                            <div className="space-y-2">
                                {paymentsHistory.map((p: any) => (
                                    <div key={p.id} className="flex flex-row-reverse items-center justify-between text-xs font-bold bg-white p-3 rounded-xl border border-gray-100">
                                        <span className="text-gray-500">{new Date(p.date).toLocaleDateString('ar-EG')}</span>
                                        <span className="text-blue-600">{p.description}</span>
                                        <span className="text-gray-900">{p.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م</span>
                                        {!isTeacher && <button
                                            onClick={() => deleteSalaryMutation.mutate(p.id)}
                                            disabled={deleteSalaryMutation.isPending}
                                            className="text-red-400 hover:text-red-600 disabled:opacity-50"
                                        >
                                            {deleteSalaryMutation.isPending ? <Loader size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                        </button>}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* أزرار الإجراءات النهائية (صرف كامل المتبقي أو إرسال تقرير) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
                    {!isTeacher && (
                        <button
                            onClick={() => handlePaySalary(remainingToPay, 'صرف نهائي')}
                            disabled={remainingToPay <= 0}
                            className="h-14 bg-blue-600 text-white rounded-[24px] font-black shadow-xl shadow-blue-600/20 hover:scale-[1.02] active:scale-95 transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
                        >
                            صرف المتبقي ({remainingToPay.toLocaleString()} ج.م) نهائياً 💸
                        </button>
                    )}
                    {!isTeacher && (
                        <button
                            onClick={handleSendReport}
                            className="h-14 bg-green-50 text-green-700 border border-green-100 rounded-[24px] font-black hover:bg-green-100 transition-all text-sm flex items-center justify-center gap-2"
                        >
                            <MessageCircle size={18} />
                            إرسال التقرير للمدرس 💬
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};