"use client";

import { useState } from 'react';
import { Calendar, CircleDollarSign, MessageCircle, Trash2, Loader, ChevronRight, ChevronLeft, X, Wallet, Plus, Banknote, AlertCircle } from 'lucide-react';
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
    isPartnership?: boolean;
    partnershipPercentage?: number;
    totalCollectedForGroup?: number;
    expectedPartnershipSalary?: number;
    totalWorkingDays?: number;
    attendedDays?: number;
    absentDays?: number;
    totalAbsentDays?: number;
    dailyRate?: number;
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
    isPartnership,
    partnershipPercentage,
    totalCollectedForGroup,
    expectedPartnershipSalary = 0,
    totalWorkingDays = 22,
    attendedDays = 0,
    absentDays = 0,
    totalAbsentDays = 0,
    dailyRate = 0
}: TeacherPayrollTabProps) => {

    const [showPayModal, setShowPayModal] = useState(false);
    const [payAmount, setPayAmount] = useState('');
    const [payNote, setPayNote] = useState('');

    const handleManualPay = () => {
        const amount = parseFloat(payAmount);
        if (isNaN(amount) || amount <= 0) return;
        handlePaySalary(amount, payNote || 'مصروف راتب (يدوي)');
        setShowPayModal(false);
        setPayAmount('');
        setPayNote('');
    };

    const totalRewards = autoRewards + manualRewardsTotal;
    const totalDeductions = autoDeductions + manualDeductionsTotal;

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-10">

            {/* شريط الشهر */}
            <div className="flex flex-row-reverse items-center justify-between bg-white p-2 md:p-4 rounded-2xl md:rounded-3xl border border-gray-100 shadow-sm gap-2">
                <button onClick={() => updateMonth(-1)} className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold border border-gray-100 text-gray-500 hover:bg-gray-50 transition-all shrink-0 h-10 md:h-auto">
                    <ChevronRight size={16} />
                    <span className="hidden md:inline">الشهر السابق</span>
                </button>
                <div className="flex-1 flex justify-center w-full min-w-0 mx-1">
                    <div className="bg-gray-50 px-3 md:px-6 py-2 rounded-xl border border-gray-100 text-xs md:text-sm font-bold flex items-center justify-center gap-2 text-gray-700 relative w-full md:w-auto max-w-[200px]">
                        <span className="truncate" dir="ltr">{selectedMonthRaw}</span>
                        <Calendar size={14} className="text-gray-400 shrink-0" />
                        <input type="month" className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" value={selectedMonthRaw} onChange={(e) => updateMonth(e.target.value)} />
                    </div>
                </div>
                <button onClick={() => { const today = new Date(); updateMonth(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`); }} className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold border border-gray-100 text-gray-500 hover:bg-gray-50 transition-all shrink-0 h-10 md:h-auto">
                    <span className="hidden md:inline">الشهر الحالي</span>
                    <ChevronLeft size={16} />
                </button>
            </div>

            {/* بطاقة الراتب الرئيسية */}
            <div className="bg-white rounded-[32px] md:rounded-[48px] border border-gray-100 p-4 md:p-8 shadow-sm space-y-6 md:space-y-8 overflow-hidden relative">

                {/* خلفية جمالية */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute -top-20 -left-20 w-64 h-64 bg-blue-50 rounded-full opacity-30" />
                    <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-teal-50 rounded-full opacity-20" />
                </div>

                {/* رأس البطاقة */}
                <div className="flex flex-row-reverse items-start justify-between relative z-10">
                    <div className="text-right">
                        <h3 className="text-xl md:text-2xl font-black text-gray-900">الراتب</h3>
                        <p className="text-gray-400 font-bold text-xs md:text-sm">شهر {selectedMonth}</p>
                    </div>
                    <div className="bg-gradient-to-l from-orange-50 to-amber-50 px-4 py-2 rounded-full border border-orange-100 flex items-center gap-2 text-[10px] font-black text-orange-600 shadow-sm">
                        <span>المتبقي:</span>
                        <span className="text-orange-800">{remainingToPay.toLocaleString()} ج.م</span>
                    </div>
                </div>

                {/* بطاقات الإجماليات */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
                    {isPartnership && (
                        <div className="bg-gradient-to-br from-amber-400 to-amber-600 p-5 rounded-[28px] text-center shadow-xl shadow-amber-500/20 relative overflow-hidden">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent)]" />
                            <p className="text-[10px] font-black text-amber-50/80 relative z-10">الراتب المتوقع</p>
                            <p className="text-2xl md:text-3xl font-black text-white tracking-tight relative z-10 mt-1 font-sans">{expectedPartnershipSalary.toLocaleString()}</p>
                            <p className="text-[8px] font-black text-amber-100/50 relative z-10 mt-1">بنسبة {partnershipPercentage}%</p>
                        </div>
                    )}
                    <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-5 rounded-[28px] text-center shadow-xl shadow-gray-900/20 relative overflow-hidden">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.1),transparent)]" />
                        <p className="text-[10px] font-black text-gray-400 relative z-10">إجمالي الاستحقاق</p>
                        <p className="text-2xl md:text-3xl font-black text-white tracking-tight relative z-10 mt-1 font-sans">{totalEntitlement.toLocaleString()}</p>
                        <p className="text-[8px] font-black text-gray-500 relative z-10 mt-1">ج.م</p>
                    </div>
                    <div className="bg-gradient-to-br from-teal-500 to-emerald-600 p-5 rounded-[28px] text-center shadow-xl shadow-teal-500/20 relative overflow-hidden">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent)]" />
                        <p className="text-[10px] font-black text-teal-100/80 relative z-10">المتبقي للصرف</p>
                        <p className="text-2xl md:text-3xl font-black text-white tracking-tight relative z-10 mt-1 font-sans">{remainingToPay.toLocaleString()}</p>
                        <p className="text-[8px] font-black text-teal-200/60 relative z-10 mt-1">EGP</p>
                    </div>
                </div>

                {/* تفاصيل الحساب */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
                    <div className="space-y-3">
                        <div className="flex flex-row-reverse items-center justify-between bg-gradient-to-l from-gray-50 to-white p-4 rounded-2xl border border-gray-100 hover:shadow-sm transition-shadow">
                            <span className="text-xs md:text-sm font-bold text-gray-500">{isPartnership ? 'استحقاق الشراكة' : 'الراتب الأساسي'}</span>
                            <div className="text-left">
                                <span className="text-sm md:text-lg font-black font-sans text-gray-900">{basicSalary.toLocaleString()} ج.م</span>
                                {!isPartnership && (
                                    <div className="text-[9px] font-bold text-gray-400 mt-0.5">
                                        {dailyRate.toLocaleString()} ج.م × {attendedDays} يوم حضور من {totalWorkingDays} يوم
                                    </div>
                                )}
                            </div>
                        </div>
                        {isPartnership && (
                            <div className="text-right text-[10px] font-bold text-blue-500 bg-blue-50/50 p-3 rounded-2xl border border-blue-100">
                                محسوب بنسبة {partnershipPercentage}% من إجمالي تحصيل المجموعة ({totalCollectedForGroup?.toLocaleString()} ج.م)
                            </div>
                        )}
                        {!isPartnership && (
                            <div className="flex flex-row-reverse flex-wrap gap-2 text-[10px] font-bold">
                                <span className="bg-green-50 text-green-700 px-3 py-1.5 rounded-full border border-green-100">{attendedDays} يوم حضور</span>
                                {absentDays > 0 && <span className="bg-red-50 text-red-600 px-3 py-1.5 rounded-full border border-red-100">{absentDays} يوم غياب</span>}
                                <span className="bg-gray-50 text-gray-500 px-3 py-1.5 rounded-full border border-gray-100">{dailyRate.toLocaleString()} ج.م/يوم</span>
                            </div>
                        )}
                    </div>
                    <div className="space-y-3">
                        <div className="flex flex-row-reverse items-center justify-between bg-gradient-to-l from-green-50 to-white p-4 rounded-2xl border border-green-100 hover:shadow-sm transition-shadow">
                            <span className="text-xs md:text-sm font-bold text-green-700">المكافآت والحوافز</span>
                            <span className="text-sm md:text-lg font-black font-sans text-green-600">+{totalRewards.toLocaleString()} ج.م</span>
                        </div>
                        <div className="flex flex-row-reverse items-center justify-between bg-gradient-to-l from-red-50 to-white p-4 rounded-2xl border border-red-100 hover:shadow-sm transition-shadow">
                            <span className="text-xs md:text-sm font-bold text-red-700">الخصومات والاستقطاعات</span>
                            <span className="text-sm md:text-lg font-black font-sans text-red-600">-{totalDeductions.toLocaleString()} ج.م</span>
                        </div>
                        <div className="flex flex-row-reverse items-center justify-between bg-gradient-to-l from-purple-50 to-white p-4 rounded-2xl border border-purple-100 hover:shadow-sm transition-shadow">
                            <span className="text-xs md:text-sm font-bold text-purple-700">تم صرفه</span>
                            <span className="text-sm md:text-lg font-black font-sans text-purple-600">{totalPaid.toLocaleString()} ج.م</span>
                        </div>
                    </div>
                </div>

                {/* سجل الدفعات وأزرار الإجراءات */}
                <div className="space-y-4 pt-2 relative z-10">
                    <div className="flex flex-col md:flex-row-reverse items-center justify-between gap-3">
                        <h4 className="text-base md:text-lg font-black text-gray-800 flex items-center gap-2">
                            <Wallet size={18} className="text-blue-500" />
                            سجل صرف الراتب
                        </h4>
                        {!isTeacher && (
                            <div className="flex flex-wrap items-center justify-center gap-2">
                                {remainingToPay > 0 && (
                                    <button onClick={() => handlePaySalary(remainingToPay, 'صرف نهائي')} className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-l from-blue-600 to-blue-700 text-white rounded-xl text-xs font-black shadow-lg shadow-blue-600/20 hover:shadow-xl hover:shadow-blue-600/30 hover:scale-[1.02] active:scale-95 transition-all">
                                        <CircleDollarSign size={14} />
                                        صرف المتبقي ({remainingToPay.toLocaleString()} ج.م)
                                    </button>
                                )}
                                <button onClick={() => setShowPayModal(true)} className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-l from-teal-500 to-teal-600 text-white rounded-xl text-xs font-black shadow-lg shadow-teal-500/20 hover:shadow-xl hover:shadow-teal-500/30 hover:scale-[1.02] active:scale-95 transition-all">
                                    <Plus size={14} />
                                    صرف يدوي
                                </button>
                                <button onClick={handleSendReport} className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-l from-emerald-500 to-emerald-600 text-white rounded-xl text-xs font-black shadow-lg shadow-emerald-500/20 hover:shadow-xl hover:shadow-emerald-500/30 hover:scale-[1.02] active:scale-95 transition-all">
                                    <MessageCircle size={14} />
                                    تقرير
                                </button>
                            </div>
                        )}
                    </div>

                    {paymentsHistory.length === 0 ? (
                        <div className="bg-gray-50/50 rounded-3xl border-2 border-dashed border-gray-200 py-12 text-center">
                            <Banknote size={40} className="mx-auto text-gray-300 mb-3" />
                            <p className="text-gray-400 text-sm font-bold">لا توجد دفعات مسجلة لهذا الشهر.</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {paymentsHistory.map((p: any) => (
                                <div key={p.id} className="flex flex-row-reverse items-center justify-between bg-white p-4 rounded-2xl border border-gray-50 hover:border-gray-200 hover:shadow-sm transition-all group">
                                    <div className="flex flex-row-reverse items-center gap-3">
                                        <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center text-blue-500 shrink-0">
                                            <Banknote size={16} />
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs font-black text-gray-900 font-sans">{p.amount.toLocaleString()} ج.م</p>
                                            <p className="text-[9px] font-bold text-gray-400">{new Date(p.date).toLocaleDateString('ar-EG')}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[9px] font-bold text-gray-500 bg-gray-50 px-2 py-1 rounded-full">{p.description}</span>
                                        {!isTeacher && (
                                            <button onClick={() => deleteSalaryMutation.mutate(p.id)} disabled={deleteSalaryMutation.isPending} className="w-8 h-8 flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100">
                                                {deleteSalaryMutation.isPending ? <Loader size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* نافذة الصرف اليدوي */}
            {showPayModal && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
                    <div onClick={() => setShowPayModal(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
                    <div className="bg-white rounded-[32px] shadow-2xl border border-white/20 w-full max-w-md overflow-hidden relative animate-in fade-in zoom-in-95 duration-200">
                        <div className="bg-gradient-to-l from-teal-500 to-teal-600 p-6 text-center relative overflow-hidden">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent)]" />
                            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-3 relative z-10 backdrop-blur-sm">
                                <CircleDollarSign size={28} className="text-white" />
                            </div>
                            <h3 className="text-lg font-black text-white relative z-10">صرف راتب يدوي</h3>
                            <p className="text-sm text-teal-100 relative z-10 mt-1">أدخل المبلغ المراد صرفه للمدرس</p>
                            <button onClick={() => setShowPayModal(false)} className="absolute top-4 left-4 w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center text-white hover:bg-white/30 transition-all z-10">
                                <X size={16} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="space-y-2 text-right">
                                <label className="text-xs font-bold text-gray-500 mr-1">المبلغ (ج.م)</label>
                                <input
                                    type="number"
                                    placeholder="أدخل المبلغ..."
                                    value={payAmount}
                                    onChange={(e) => setPayAmount(e.target.value)}
                                    autoFocus
                                    className="w-full h-14 bg-gray-50 border-2 border-gray-100 rounded-2xl px-4 text-right focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-bold text-lg"
                                />
                            </div>
                            <div className="space-y-2 text-right">
                                <label className="text-xs font-bold text-gray-500 mr-1">البيان (اختياري)</label>
                                <input
                                    type="text"
                                    placeholder="مثال: صرف جزء من الراتب..."
                                    value={payNote}
                                    onChange={(e) => setPayNote(e.target.value)}
                                    className="w-full h-12 bg-gray-50 border border-gray-100 rounded-2xl px-4 text-right focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all"
                                />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button onClick={() => setShowPayModal(false)} className="flex-1 h-12 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-all text-sm">
                                    إلغاء
                                </button>
                                <button onClick={handleManualPay} disabled={!payAmount || parseFloat(payAmount) <= 0} className="flex-1 h-12 bg-gradient-to-l from-teal-500 to-teal-600 text-white rounded-2xl font-bold shadow-lg shadow-teal-500/20 hover:shadow-xl hover:shadow-teal-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm">
                                    صرف
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
