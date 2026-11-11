import { useState } from 'react';
import { Button } from '../../../components/ui/button';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2'
import ShieldCheck from 'lucide-react/dist/esm/icons/shield-check'
import Undo2 from 'lucide-react/dist/esm/icons/undo-2';
import { cn } from '../../../lib/utils';
import { useAuthStore } from '../../../store/useAuthStore';
import { useGroups } from '@/features/groups/hooks/useGroups';
import { useTeachers } from '@/features/teachers/hooks/useTeachers';
import { FadeIn, SlideIn } from '@/components/ui/transition';
import { Student } from '@/types';
import type { StudentRecordsHook } from '../hooks/types';

export default function FeesTab({ student, records }: { student: Student; records: StudentRecordsHook }) {
    const { user } = useAuthStore();
    const isDirector = user?.role === 'director';
    const isSupervisor = user?.role === 'supervisor';
    const canExempt = isDirector || isSupervisor;
    const { fees, exemptions, addFee, addExemption, deleteFee, deleteExemption } = records;
    const { data: groups } = useGroups();
    const { data: teachers } = useTeachers();

    // قائمة المجموعات مع اسم المدرس، لاختيار "المجموعة المستحقة" لكل دفعة
    const groupOptions = (groups || [])
        .map((g) => ({ id: g.id, label: `${g.name} - ${teachers?.find((t) => t.id === g.teacherId)?.fullName || 'بلا مدرس'}` }))
        .sort((a, b) => a.label.localeCompare(b.label, 'ar'));
    const getGroupLabel = (groupId?: string | null) => groupOptions.find((g) => g.id === groupId)?.label || 'غير محدد';

    // حالات مودال الدفع
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [feeAmount, setFeeAmount] = useState(student?.monthlyAmount?.toString() || '150');
    const [receiptNum, setReceiptNum] = useState('');
    const [paymentMonth, setPaymentMonth] = useState('');
    const [paymentMonthKey, setPaymentMonthKey] = useState('');
    const [creditedGroupId, setCreditedGroupId] = useState('');

    // إنشاء قائمة الشهور منذ التحاق الطالب
    const monthsList = (() => {
        if (!student?.enrollmentDate) return [];
        const dateParts = student.enrollmentDate.split('-').map(Number);
        const start = new Date(dateParts[0], dateParts[1] - 1, 1);
        const now = new Date();
        const list = [];
        const curr = new Date(now.getFullYear(), now.getMonth(), 1);
        while (curr >= start) {
            list.push({
                label: curr.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' }),
                key: `${curr.getFullYear()}-${String(curr.getMonth() + 1).padStart(2, '0')}`,
                date: new Date(curr)
            });
            curr.setMonth(curr.getMonth() - 1);
        }
        return list;
    })();

    const openPaymentModal = (monthLabel: string, monthKey: string, suggestedAmount: number) => {
        setPaymentMonth(monthLabel);
        setPaymentMonthKey(monthKey);
        setFeeAmount(String(suggestedAmount));
        // المجموعة المستحقة الافتراضية: مجموعة الطالب الحالية، قابلة للتغيير يدوياً
        // (مهم لو كانت الدفعة متأخرة لشهر كان الطالب فيه مع مدرس آخر)
        setCreditedGroupId(student.groupId || '');
        setIsPaymentModalOpen(true);
    };

    const handleSaveFee = () => {
        if (!receiptNum) return alert('برجاء إدخال رقم الوصل');

        // 1. تسجيل الرسوم للطالب
        addFee.mutate({
            studentId: student.id,
            month: paymentMonthKey,
            amount: `${feeAmount} ج.م`,
            receipt: receiptNum,
            date: new Date().toISOString().split('T')[0],
            createdBy: user?.displayName || 'غير معروف',
            creditedGroupId: creditedGroupId || null,
        });

        const currentFeeAmount = feeAmount;
        const currentPaymentMonth = paymentMonth;

        // 2. مزامنة مع الخزينة المالية (إيراد) - تعمل في الخلفية دون انتظارها
        // حتى تختفي النافذة فوراً بعد الضغط على تأكيد الدفع
        import('@/features/finance/services/financeService')
            .then(({ addTransaction }) => addTransaction({
                amount: Number(currentFeeAmount),
                type: 'income',
                category: 'fees',
                date: new Date().toISOString().split('T')[0],
                description: `رسوم ${currentPaymentMonth} - الطالب: ${student.fullName}`,
                relatedUserId: student.id,
                performedBy: user?.uid || 'غير معروف'
            }))
            .catch((e) => console.error(e));

        setIsPaymentModalOpen(false);
        setReceiptNum('');
    };

    return (
        <div className="space-y-6 text-right">
            {/* عرض حالة الشهور */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {monthsList.map((m) => {
                    const monthFees = fees.filter((f) => f.month === m.label || f.month === m.key);
                    const exemption = exemptions.find((e) => e.month === m.label || e.month === m.key);
                    const monthlyAmount = student.monthlyAmount || 0;
                    const totalPaidForMonth = monthFees.reduce((sum, f) => sum + (Number(f.amount?.toString().replace(/[^0-9.]/g, '')) || 0), 0);
                    const remainingForMonth = Math.max(0, monthlyAmount - totalPaidForMonth);
                    const isFullyPaid = monthFees.length > 0 && remainingForMonth <= 0;
                    const isPartiallyPaid = monthFees.length > 0 && remainingForMonth > 0;

                    return (
                        <div key={m.key} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm space-y-2">
                            <div className="flex items-center justify-between">
                                <div className="flex-1">
                                    <h5 className="font-bold text-gray-800 text-sm">{m.label}</h5>
                                    <p className={cn("text-[10px] font-bold mt-0.5", isFullyPaid ? "text-green-500" : isPartiallyPaid ? "text-blue-500" : exemption ? "text-purple-500" : "text-amber-500")}>
                                        {isFullyPaid ? "✓ تم السداد" : isPartiallyPaid ? `◐ سداد جزئي (باقي ${remainingForMonth} ج.م)` : exemption ? "✨ تم العفو" : "⚠ مطلوب السداد"}
                                    </p>
                                </div>

                                <div className="flex items-center gap-2">
                                    {/* إعفاء - للمدير أو المشرف فقط */}
                                    {monthFees.length === 0 && !exemption && canExempt && (
                                        <button
                                            onClick={() => {
                                                if (confirm(`هل أنت متأكد من العفو عن ${m.label} للطالب ${student.fullName}؟`)) {
                                                    addExemption.mutate({
                                                        studentId: student.id,
                                                        studentName: student.fullName,
                                                        month: m.key,
                                                        amount: student.monthlyAmount || 0,
                                                        exemptedBy: user?.displayName || 'المدير',
                                                    });
                                                }
                                            }}
                                            className="px-3 py-2 bg-purple-600 text-white rounded-xl text-xs font-bold">
                                            <ShieldCheck size={14} className="inline ml-1" />
                                            العفو
                                        </button>
                                    )}

                                    {/* إلغاء العفو - للمدير أو المشرف فقط */}
                                    {exemption && canExempt && (
                                        <button
                                            onClick={() => {
                                                if (confirm(`هل أنت متأكد من إلغاء العفو عن ${m.label}؟`)) {
                                                    deleteExemption.mutate(exemption.id);
                                                }
                                            }}
                                            className="p-2 text-purple-500 hover:bg-purple-50 rounded-xl transition-colors"
                                            title="إلغاء العفو">
                                            <Undo2 size={16} />
                                        </button>
                                    )}

                                    {!isFullyPaid && !exemption && (
                                        <button
                                            onClick={() => openPaymentModal(m.label, m.key, remainingForMonth || monthlyAmount)}
                                            className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold whitespace-nowrap">
                                            {monthFees.length > 0 ? 'تسجيل دفعة أخرى' : 'تسجيل دفع'}
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* تفاصيل كل دفعة مسجَّلة لهذا الشهر (قد تكون أكثر من دفعة لو تم تقسيمها بين مدرسين) */}
                            {monthFees.length > 0 && (
                                <div className="space-y-1.5 pt-1 border-t border-gray-50">
                                    {monthFees.map((f) => {
                                        const paymentDate = new Date(f.date);
                                        const now = new Date();
                                        const diffDays = Math.floor((now.getTime() - paymentDate.getTime()) / (1000 * 60 * 60 * 24));
                                        const canDelete = isDirector || (user?.role === 'teacher' && diffDays <= 3);
                                        const creditedLabel = f.creditedGroupId ? getGroupLabel(f.creditedGroupId) : null;
                                        const isDifferentFromCurrent = f.creditedGroupId && f.creditedGroupId !== student.groupId;

                                        return (
                                            <div key={f.id} className="flex items-center justify-between gap-2 bg-gray-50/70 rounded-xl px-2.5 py-1.5">
                                                <span className="text-[9px] text-gray-600 truncate">
                                                    {f.amount} | وصل: {f.receipt} | {f.date}
                                                    {creditedLabel && (
                                                        <span className={cn("mr-1.5", isDifferentFromCurrent ? "text-amber-600 font-bold" : "text-gray-400")}>
                                                            · مستحقة لـ: {creditedLabel}
                                                        </span>
                                                    )}
                                                </span>
                                                {canDelete && (
                                                    <button
                                                        onClick={() => {
                                                            if (confirm('هل أنت متأكد من إلغاء عملية الدفع؟ سيتم حذف العملية بالكامل')) {
                                                                deleteFee.mutate(f.id);
                                                            }
                                                        }}
                                                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0">
                                                        <Trash2 size={13} />
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* مودال تسجيل الدفع السريع */}
            <FadeIn show={isPaymentModalOpen} className="fixed inset-0 z-[300]">
                <div onClick={() => setIsPaymentModalOpen(false)} className="absolute inset-0 bg-black/40" />
            </FadeIn>
            <SlideIn show={isPaymentModalOpen} className="fixed inset-0 z-[300] flex items-center justify-center p-4">
                <div className="relative bg-white p-6 rounded-[32px] w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
                    <h3 className="font-black mb-4">تسجيل دفع: {paymentMonth}</h3>
                    <input type="number" value={feeAmount} onChange={(e) => setFeeAmount(e.target.value)} className="w-full p-3 bg-gray-50 rounded-xl mb-3" placeholder="المبلغ" />
                    <input type="text" value={receiptNum} onChange={(e) => setReceiptNum(e.target.value)} className="w-full p-3 bg-gray-50 rounded-xl mb-3" placeholder="رقم الوصل" />

                    <label className="block text-[11px] font-bold text-gray-400 mb-1.5 pr-1">المجموعة المستحقة لهذه الدفعة</label>
                    <select
                        value={creditedGroupId}
                        onChange={(e) => setCreditedGroupId(e.target.value)}
                        className="w-full p-3 bg-gray-50 rounded-xl mb-1 text-sm font-bold text-gray-700"
                    >
                        <option value="">غير محدد (مجموعة الطالب الحالية)</option>
                        {groupOptions.map((g) => (
                            <option key={g.id} value={g.id}>{g.label}</option>
                        ))}
                    </select>
                    <p className="text-[10px] text-gray-400 mb-4 pr-1">
                        غيّرها فقط لو الدفعة متأخرة لشهر كان الطالب فيه مع مدرس آخر غير مدرسه الحالي.
                    </p>

                    <Button onClick={handleSaveFee} className="w-full bg-blue-600">تأكيد الدفع</Button>
                </div>
            </SlideIn>
        </div>
    );
}
