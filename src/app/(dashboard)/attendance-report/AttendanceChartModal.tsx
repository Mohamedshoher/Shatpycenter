import { motion, AnimatePresence } from 'framer-motion';
import { UserX, FileText, X, Users, BarChart2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface AttendanceChartModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    type: 'present' | 'absent';
    data?: { name: string; count: number }[];
}

export default function AttendanceChartModal({ isOpen, onClose, title, type, data = [] }: AttendanceChartModalProps) {
    // إيجاد أعلى قيمة لحساب نسبة عرض الأعمدة
    const maxCount = data.length > 0 ? Math.max(...data.map(d => d.count)) : 0;
    
    // حساب المجموع الكلي
    const totalCount = data.reduce((acc, curr) => acc + curr.count, 0);

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={onClose} className="fixed inset-0 bg-black/60 backdrop-blur-sm" />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative bg-white w-[95vw] max-w-4xl h-[85vh] rounded-[30px] shadow-2xl z-[201] overflow-hidden flex flex-col text-right">

                        {/* Header */}
                        <div className={cn(
                            "p-3 px-5 flex items-center justify-between text-white shrink-0",
                            type === 'absent' ? "bg-red-500" : "bg-green-500"
                        )}>
                            <div className="flex items-center gap-2">
                                {type === 'absent' ? <BarChart2 size={18} /> : <BarChart2 size={18} className="rotate-180" />}
                                <div>
                                    <h3 className="font-black text-base">{title}</h3>
                                    <p className="text-[9px] font-bold opacity-80 leading-none mt-0.5">إحصائية اليوم المختار مقسمة حسب الفصول</p>
                                </div>
                            </div>
                            <button onClick={onClose} className="w-8 h-8 bg-black/10 rounded-lg flex items-center justify-center hover:bg-black/20 transition-all">
                                <X size={16} />
                            </button>
                        </div>

                        {/* Content - المخطط البياني */}
                        <div className="p-6 flex-1 overflow-y-auto bg-gray-50/50">
                            {data.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-gray-400 opacity-50">
                                    <Users size={48} className="mb-4 text-gray-300" />
                                    <p className="font-black text-lg">لا توجد بيانات ليوم العرض الحالي</p>
                                </div>
                            ) : (
                                <div className="space-y-5">
                                    {data.map((item, index) => {
                                        const widthPercentage = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
                                        return (
                                            <div key={index} className="flex flex-col gap-2 group">
                                                <div className="flex justify-between items-end">
                                                    <span className="text-[11px] font-black text-gray-700 bg-white px-2 py-0.5 rounded-lg border border-gray-100 shadow-sm">{item.name}</span>
                                                    <span className={cn(
                                                        "font-black text-sm",
                                                        type === 'absent' ? 'text-red-500' : 'text-green-500'
                                                    )}>{item.count} طالب</span>
                                                </div>
                                                <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden shadow-inner">
                                                    <motion.div 
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${widthPercentage}%` }}
                                                        transition={{ duration: 0.7, ease: "easeOut", delay: index * 0.05 }}
                                                        className={cn(
                                                            "h-full rounded-full relative",
                                                            type === 'absent' ? "bg-gradient-to-r from-red-400 to-red-500" : "bg-gradient-to-r from-green-400 to-green-500"
                                                        )}
                                                    >
                                                        {/* لمعة جمالية داخل العمود */}
                                                        <div className="absolute top-0 right-0 w-full h-full bg-white/20" />
                                                    </motion.div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-4 bg-white border-t border-gray-100 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-gray-400">الإجمالي الشامل لليوم:</span>
                                <span className={cn(
                                    "font-black text-base bg-gray-50 px-3 py-1 rounded-xl border",
                                    type === 'absent' ? "text-red-600 border-red-100" : "text-green-600 border-green-100"
                                )}>{totalCount}</span>
                            </div>
                            <Button onClick={onClose} className="bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-gray-800 shadow-md">
                                إغلاق
                            </Button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
