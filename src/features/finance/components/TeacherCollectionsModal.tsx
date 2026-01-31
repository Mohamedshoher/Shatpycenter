"use client";

import { motion, AnimatePresence } from 'framer-motion';
import { X, User, ArrowUpCircle, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Teacher } from '@/types';

interface TeacherCollection {
    teacherId: string;
    teacherName: string;
    amount: number;
    transactionCount: number;
    deficit?: number;
    unpaidCount?: number;
    expected?: number;
    teacher?: Teacher;
}

interface TeacherCollectionsModalProps {
    isOpen: boolean;
    onClose: () => void;
    collections: TeacherCollection[];
    onTeacherClick: (teacher: Teacher) => void;
    monthName: string;
    showDeficitOnly?: boolean;
    showExpectedOnly?: boolean;
}

export default function TeacherCollectionsModal({
    isOpen,
    onClose,
    collections,
    onTeacherClick,
    monthName,
    showDeficitOnly = false,
    showExpectedOnly = false
}: TeacherCollectionsModalProps) {
    const totalAmount = collections.reduce((sum, c) => {
        if (showDeficitOnly) return sum + (c.deficit || 0);
        if (showExpectedOnly) return sum + (c.expected || 0);
        return sum + c.amount;
    }, 0);

    const sortedCollections = [...collections].sort((a, b) => {
        if (showDeficitOnly) return (b.deficit || 0) - (a.deficit || 0);
        if (showExpectedOnly) return (b.expected || 0) - (a.expected || 0);
        return b.amount - a.amount;
    });

    const isIndigo = showExpectedOnly;
    const isAmber = showDeficitOnly;
    const isBlue = !isIndigo && !isAmber;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed inset-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[600px] h-fit max-h-[90vh] bg-white rounded-[40px] shadow-2xl z-[101] overflow-hidden flex flex-col border border-gray-100"
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-white shrink-0">
                            <button
                                onClick={onClose}
                                className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all font-sans"
                            >
                                <X size={20} />
                            </button>
                            <div className="text-right">
                                <h2 className="text-xl font-black text-gray-900">
                                    {showDeficitOnly ? 'عجز مجموعات المدرسين' :
                                        showExpectedOnly ? 'إجمالي المبالغ المتوقعة' :
                                            'تفاصيل تحصيل المدرسين'}
                                </h2>
                                <p className="text-xs font-bold text-gray-400">شهر {monthName}</p>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                            {sortedCollections.length > 0 ? (
                                sortedCollections.map((collection) => (
                                    <div
                                        key={collection.teacherId}
                                        onClick={() => collection.teacher && onTeacherClick(collection.teacher)}
                                        className={cn(
                                            "bg-gray-50/50 border border-gray-100 rounded-[28px] p-5 transition-all cursor-pointer group flex items-center justify-between gap-4",
                                            isAmber && "hover:bg-amber-50/50 hover:border-amber-100",
                                            isIndigo && "hover:bg-indigo-50/50 hover:border-indigo-100",
                                            isBlue && "hover:bg-blue-50/50 hover:border-blue-100"
                                        )}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={cn(
                                                "w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm transition-all",
                                                isAmber && "text-amber-600 group-hover:bg-amber-600 group-hover:text-white",
                                                isIndigo && "text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white",
                                                isBlue && "text-blue-600 group-hover:bg-blue-600 group-hover:text-white"
                                            )}>
                                                <User size={24} />
                                            </div>
                                            <div className="text-right">
                                                <h3 className={cn(
                                                    "font-bold text-gray-900 transition-all flex items-center gap-2 justify-end",
                                                    isAmber && "group-hover:text-amber-700",
                                                    isIndigo && "group-hover:text-indigo-700",
                                                    isBlue && "group-hover:text-blue-700"
                                                )}>
                                                    <ExternalLink size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    {collection.teacherName}
                                                </h3>
                                                <p className="text-[10px] font-bold text-gray-400">
                                                    {showDeficitOnly ? `طلاب غير مسددين: ${collection.unpaidCount || 0}` :
                                                        showExpectedOnly ? 'رسوم طلاب المجموعات' :
                                                            `عدد المعاملات: ${collection.transactionCount}`}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="text-left">
                                            <div className={cn(
                                                "text-lg font-black font-sans tracking-tight",
                                                isAmber && "text-amber-600",
                                                isIndigo && "text-indigo-600",
                                                isBlue && "text-blue-600"
                                            )}>
                                                {(showDeficitOnly ? collection.deficit :
                                                    showExpectedOnly ? collection.expected :
                                                        collection.amount)?.toLocaleString()} <span className="text-[10px]">ج.م</span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-12 space-y-3 bg-gray-50 rounded-[32px] border border-dashed border-gray-200">
                                    <ArrowUpCircle size={48} className="mx-auto text-gray-200" />
                                    <p className="text-gray-400 font-bold">
                                        لا توجد بيانات مسجلة لهذا التبويب
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Footer Summary */}
                        <div className={cn(
                            "p-6 text-white shrink-0 transition-colors duration-300",
                            isAmber && "bg-amber-600",
                            isIndigo && "bg-indigo-600",
                            isBlue && "bg-blue-600"
                        )}>
                            <div className="flex justify-between items-center">
                                <div className="text-2xl font-black font-sans">
                                    {totalAmount.toLocaleString()} <span className="text-sm font-bold">ج.م</span>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-bold opacity-80 uppercase tracking-widest">
                                        {showDeficitOnly ? 'إجمالي عجز المجموعات' :
                                            showExpectedOnly ? 'إجمالي الإيرادات المتوقعة' :
                                                'إجمالي تحصيل المدرسين'}
                                    </p>
                                    <p className="text-xs font-black">لهذا الشهر</p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
