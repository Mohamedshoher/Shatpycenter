// التحصيل من المدرس ومن المدير
import { motion, AnimatePresence } from 'framer-motion';
import { X, CircleDollarSign, AlertCircle, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    totalAmount: number;
    payments: any[];
    isDirector: boolean;
    onDeleteFee: (feeId: string, studentName: string) => void;
    accentColor?: 'blue' | 'indigo';
}

export const TeacherCollectedPaymentsModal = ({
    isOpen, onClose, title, totalAmount, payments, isDirector, onDeleteFee, accentColor = 'blue'
}: Props) => {
    // دالة تحويل الأرقام (نفس التي في كودك)
    const arabicToEnglishNumber = (str: string): number => {
        const arabicNumerals = '٠١٢٣٤٥٦٧٨٩';
        const converted = String(str).replace(/[٠-٩]/g, d => arabicNumerals.indexOf(d).toString());
        return parseInt(converted.replace(/[^0-9]/g, '')) || 0;
    };

    const colorClasses = accentColor === 'blue' 
        ? { bg: 'bg-blue-50', text: 'text-blue-600', border: 'hover:border-blue-200' }
        : { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'hover:border-indigo-200' };

    return (
        <AnimatePresence>
            {isOpen && (
                <div key={`collected-payments-container-${title}`}>
                    <motion.div 
                        key="collected-backdrop"
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[250] bg-black/20 backdrop-blur-[2px]" 
                        onClick={onClose} 
                    />
                    <motion.div 
                        key="collected-content"
                        initial={{ opacity: 0, scale: 0.95, y: 20 }} 
                        animate={{ opacity: 1, scale: 1, y: 0 }} 
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95%] max-w-3xl bg-white rounded-[40px] shadow-2xl border border-gray-100 p-6 z-[251] h-[80vh] flex flex-col"
                    >
                        <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-50">
                            <div className="flex items-center gap-3">
                                <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", colorClasses.bg, colorClasses.text)}>
                                    <CircleDollarSign size={24} />
                                </div>
                                <div className="text-right">
                                    <h3 className="text-xl font-bold text-gray-900">{title}</h3>
                                    <p className="text-xs text-gray-400 font-bold">إجمالي: {totalAmount.toLocaleString()} ج.م</p>
                                </div>
                            </div>
                            <button onClick={onClose} className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center"><X size={20} /></button>
                        </div>

                        <div className="flex-1 overflow-y-auto no-scrollbar p-1">
                            <div className="space-y-3">
                                {payments.length === 0 ? (
                                    <div className="py-20 text-center text-gray-400 font-bold bg-white rounded-[32px] border-2 border-dashed border-gray-100">لا توجد سجلات</div>
                                ) : (
                                    [...payments].sort((a, b) => arabicToEnglishNumber(a.id) - arabicToEnglishNumber(b.id)).map((payment, index, array) => {
                                        const currentId = arabicToEnglishNumber(payment.id);
                                        const lastId = index > 0 ? arabicToEnglishNumber(array[index-1].id) : -1;
                                        const hasGap = lastId !== -1 && currentId > lastId + 1;

                                        return (
                                            <div key={`${payment.feeId}-${index}`}>
                                                {hasGap && (
                                                    <div className="bg-red-50 border border-red-100 rounded-2xl p-4 mb-3 flex items-center gap-3 text-red-600">
                                                        <AlertCircle size={18} />
                                                        <p className="text-xs font-black">يوجد سقوط في أرقام الوصلات قبل الرقم #{payment.id}</p>
                                                    </div>
                                                )}
                                                <div className={cn("bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center justify-between group transition-all", colorClasses.border)}>
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center font-sans font-black text-xs text-gray-400 border">#{payment.id}</div>
                                                        <div className="text-right">
                                                            <h4 className="font-bold text-gray-900">{payment.studentName}</h4>
                                                            <div className="flex gap-2 mt-1">
                                                                <span className={cn("text-[10px] px-2 py-0.5 rounded-md font-bold", colorClasses.bg, colorClasses.text)}>{payment.groupName}</span>
                                                                <span className="text-[10px] text-gray-400 font-sans">{payment.date}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="text-left font-sans flex flex-col items-end gap-2">
                                                        <p className="text-lg font-black text-emerald-600">{payment.amount.toLocaleString()} ج.م</p>
                                                        {isDirector && (
                                                            <button onClick={() => onDeleteFee(payment.feeId, payment.studentName)} className="w-7 h-7 rounded-lg bg-red-50 text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center"><Trash2 size={14} /></button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};