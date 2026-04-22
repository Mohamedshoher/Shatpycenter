import React from 'react';
import { Trash2, Calendar, Star, Clock, User } from 'lucide-react';
import { IqraLog } from '../services/iqraService';
import { motion, AnimatePresence } from 'framer-motion';

interface IqraHistoryListProps {
    logs: IqraLog[];
    supervisorName?: string;
    onDelete: (id: string) => void;
}

export default function IqraHistoryList({ logs, supervisorName, onDelete }: IqraHistoryListProps) {
    if (logs.length === 0) {
        return (
            <div className="py-12 text-center bg-gray-50/50 rounded-[40px] border-2 border-dashed border-gray-100 italic text-gray-400 font-bold">
                لا توجد سجلات متابعة بعد
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <h3 className="text-sm font-black text-gray-900 pr-2 border-r-4 border-blue-500">سجل المتابعات الأسبوعية</h3>
            <div className="space-y-3 relative">
                {/* الخط الرأسي للخط الزمني */}
                <div className="absolute top-0 bottom-0 right-7 w-0.5 bg-gray-100 hidden md:block" />
                
                <AnimatePresence>
                    {logs.map((log) => (
                        <motion.div
                            key={log.id}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-3xl p-4 border border-gray-100 shadow-sm relative group hover:border-blue-200 transition-all"
                        >
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    {/* دائرة المؤشر الزمني */}
                                    <div className="w-6 h-6 bg-blue-500 rounded-full border-4 border-white shadow-sm z-10 hidden md:block" />
                                    
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="bg-blue-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full">محاضرة {log.lecture_number}</span>
                                            <h4 className="font-bold text-gray-900 text-sm">{supervisorName || 'متابعة مع الشيخ'}</h4>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 font-bold">
                                            <div className="flex items-center gap-1.5"><Calendar size={13} /> {log.sheikh_follow_up_day}</div>
                                            <div className="flex items-center gap-1.5"><Clock size={13} /> {log.sheikh_follow_up_time || 'غير محدد'}</div>
                                            <div className="flex items-center gap-1.5 text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-100"><Star size={11} fill="currentColor" /> {log.sheikh_follow_up_grade}</div>
                                        </div>
                                        {log.notes && (
                                            <p className="text-[11px] font-bold text-gray-600 bg-gray-50 p-2 rounded-xl border border-gray-100 mt-2">
                                                <span className="text-gray-400">ملحوظة:</span> {log.notes}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center justify-between border-t border-gray-50 pt-3 md:pt-0 md:border-0 md:justify-end gap-3">
                                    <div className="flex flex-col items-end">
                                        <span className="text-[10px] text-gray-400 font-bold">{new Date(log.created_at).toLocaleDateString('ar-EG')}</span>
                                    </div>
                                    <button
                                        onClick={() => {
                                            if (confirm('هل أنت متأكد من حذف هذا السجل؟')) onDelete(log.id);
                                        }}
                                        className="w-10 h-10 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </div>
    );
}
