import { useState } from 'react';
import { Button } from '../../../components/ui/button';
import { CreditCard, Trash2, Calendar, FileText, User } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { useAuthStore } from '../../../store/useAuthStore';
import { motion, AnimatePresence } from 'framer-motion';

export default function FeesTab({ student, records }: any) {
    const { user } = useAuthStore();
    const isDirector = user?.role === 'director';
    const { fees, exemptions, addFee, deleteFee, deleteExemption } = records;

    // حالات مودال الدفع
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [feeAmount, setFeeAmount] = useState(student?.monthlyAmount?.toString() || '150');
    const [receiptNum, setReceiptNum] = useState('');
    const [paymentMonth, setPaymentMonth] = useState('');
    const [paymentMonthKey, setPaymentMonthKey] = useState('');

    // إنشاء قائمة الشهور منذ التحاق الطالب
    const monthsList = (() => {
        if (!student?.enrollmentDate) return [];
        const dateParts = student.enrollmentDate.split('-').map(Number);
        const start = new Date(dateParts[0], dateParts[1] - 1, 1);
        const now = new Date();
        const list = [];
        let curr = new Date(now.getFullYear(), now.getMonth(), 1);
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

    const handleSaveFee = async () => {
        if (!receiptNum) return alert('برجاء إدخال رقم الوصل');

        // 1. تسجيل الرسوم للطالب
        addFee.mutate({
            studentId: student.id,
            month: paymentMonthKey,
            amount: `${feeAmount} ج.م`,
            receipt: receiptNum,
            date: new Date().toISOString().split('T')[0],
            createdBy: user?.displayName || 'غير معروف',
        });

        // 2. مزامنة مع الخزينة المالية (إيراد)
        try {
            const { addTransaction } = await import('@/features/finance/services/financeService');
            await addTransaction({
                amount: Number(feeAmount),
                type: 'income',
                category: 'fees',
                date: new Date().toISOString().split('T')[0],
                description: `رسوم ${paymentMonth} - الطالب: ${student.fullName}`,
                relatedUserId: student.id,
                performedBy: user?.uid || 'غير معروف'
            });
        } catch (e) { console.error(e); }

        setIsPaymentModalOpen(false);
        setReceiptNum('');
    };

    return (
        <div className="space-y-6 text-right">
            {/* عرض حالة الشهور */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {monthsList.map((m) => {
                    const studentFee = fees.find((f: any) => f.month === m.label || f.month === m.key);
                    const exemption = exemptions.find((e: any) => e.month === m.label || e.month === m.key);

                    return (
                        <div key={m.key} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center justify-between">
                            <div className="flex-1">
                                <h5 className="font-bold text-gray-800 text-sm">{m.label}</h5>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <p className={cn("text-[10px] font-bold", studentFee ? "text-green-500" : exemption ? "text-purple-500" : "text-amber-500")}>
                                        {studentFee ? "✓ تم السداد" : exemption ? "✨ تم العفو" : "⚠ مطلوب السداد"}
                                    </p>

                                    {studentFee && (
                                        <span className="text-[9px] bg-gray-50 px-1.5 py-0.5 rounded text-gray-600 border border-gray-100">
                                            المبلغ: {studentFee.amount} | وصل: {studentFee.receipt} | {studentFee.date}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                {studentFee && (() => {
                                    const paymentDate = new Date(studentFee.date);
                                    const now = new Date();
                                    const diffDays = Math.floor((now.getTime() - paymentDate.getTime()) / (1000 * 60 * 60 * 24));
                                    const canDelete = isDirector || (user?.role === 'teacher' && diffDays <= 3);

                                    return canDelete && (
                                        <button
                                            onClick={() => {
                                                if (confirm('هل أنت متأكد من إلغاء عملية الدفع؟ سيتم حذف العملية بالكامل')) {
                                                    deleteFee.mutate(studentFee.id);
                                                }
                                            }}
                                            className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors">
                                            <Trash2 size={16} />
                                        </button>
                                    );
                                })()}

                                {!studentFee && !exemption && (
                                    <button
                                        onClick={() => {
                                            setPaymentMonth(m.label);
                                            setPaymentMonthKey(m.key);
                                            setIsPaymentModalOpen(true);
                                        }}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold">
                                        تسجيل دفع
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* مودال تسجيل الدفع السريع */}
            <AnimatePresence>
                {isPaymentModalOpen && (
                    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={() => setIsPaymentModalOpen(false)} className="absolute inset-0 bg-black/40" />
                        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="relative bg-white p-6 rounded-[32px] w-full max-w-sm">
                            <h3 className="font-black mb-4">تسجيل دفع: {paymentMonth}</h3>
                            <input type="number" value={feeAmount} onChange={(e) => setFeeAmount(e.target.value)} className="w-full p-3 bg-gray-50 rounded-xl mb-3" placeholder="المبلغ" />
                            <input type="text" value={receiptNum} onChange={(e) => setReceiptNum(e.target.value)} className="w-full p-3 bg-gray-50 rounded-xl mb-4" placeholder="رقم الوصل" />
                            <Button onClick={handleSaveFee} className="w-full bg-blue-600">تأكيد الدفع</Button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}