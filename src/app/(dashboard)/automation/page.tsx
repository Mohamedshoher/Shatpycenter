'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAutomationExecution } from '@/features/automation/hooks/useAutomationExecution';
import { useAutomation } from '@/features/automation/hooks/useAutomation';
import { Calendar, Trash2, BookOpen, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AutomationPage() {
    const { isExecuting, isExecutingExams, executeMissingReportDeduction, executeMissingExamDeduction } = useAutomationExecution();
    const { logs, loading: logsLoading, loadLogs, undoLogAction } = useAutomation();

    const [selectedDate, setSelectedDate] = useState<string>(''); // Empty means Latest

    useEffect(() => {
        loadLogs(selectedDate);
    }, [loadLogs, selectedDate]);

    const handleUndo = async (logId: string, teacherId: string, timestamp: Date) => {
        try {
            await undoLogAction(logId, teacherId, timestamp);
        } catch (e) {
            console.error("Undo failed:", e);
        }
    };

    const handleRunReportCheck = async () => {
        if (confirm("هل أنت متأكد من رغبتك في تشغيل فحص التقارير اليومية وتطبيق الخصومات على المخالفين؟")) {
            const result = await executeMissingReportDeduction();
            setSelectedDate(''); // نعود لأحدث سجل عند التشغيل
            loadLogs('');

            const violators = (result || []).filter((r: any) => r.recipientId !== 'system');

            if (violators.length > 0) {
                alert(`✅ تمت العملية بنجاح! تم تسجيل ${violators.length} مخالفة.`);
            } else {
                alert("✨ تم الفحص: لم يتم العثور على مخالفات جديدة اليوم.");
            }
        }
    };

    const handleRunExamCheck = async () => {
        if (confirm("هل أنت متأكد من رغبتك في تشغيل فحص الاختبارات اليومية وتطبيق الخصومات على من لم يسجّل اختباراً؟")) {
            const result = await executeMissingExamDeduction();
            setSelectedDate(''); // نعود لأحدث سجل عند التشغيل الجديد
            loadLogs('');

            const violators = (result || []).filter((r: any) => r.recipientId !== 'system');

            if (violators.length > 0) {
                alert(`✅ تمت العملية بنجاح! تم تسجيل ${violators.length} مخالفة.`);
            } else {
                alert("✨ تم الفحص: لم يتم العثور على مخالفات جديدة اليوم.");
            }
        }
    };

    const reportLogs = logs.filter(log => log.ruleName.includes('تقرير'));
    const examLogs = logs.filter(log => log.ruleName.includes('اختبار'));

    const renderLogList = (items: typeof logs, title: string, Icon: any, colorClass: string, bgClass: string, borderClass: string) => (
        <div className={`rounded-3xl p-6 shadow-sm border ${borderClass} h-full flex flex-col ${bgClass}`}>
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl shadow-sm ${colorClass} bg-white border border-current/10`}>
                        <Icon className="w-5 h-5" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">{title}</h2>
                </div>
                <span className={`text-xs font-black px-3 py-1 rounded-full ${colorClass} bg-white shadow-sm border border-current/10`}>
                    {items.filter(i => i.recipientId !== 'system').length} عملية
                </span>
            </div>

            {logsLoading ? (
                <div className="text-center py-12 text-gray-400">جاري التحميل...</div>
            ) : items.length > 0 ? (
                <div className="space-y-3 flex-1 overflow-y-auto max-h-[600px] pr-1 custom-scrollbar">
                    {items.map((log, index) => (
                        <div key={log.id} className={cn(
                            "bg-white/80 backdrop-blur-sm rounded-2xl p-4 flex items-center gap-4 border border-white/50 hover:shadow-md transition-all relative overflow-hidden group",
                            log.recipientId === 'system' && "bg-green-50/50 border-green-100"
                        )}>
                            <div className={cn(
                                "absolute top-0 right-0 w-1.5 h-full",
                                log.recipientId === 'system' ? 'bg-indigo-400' : log.status === 'success' ? 'bg-green-500' : 'bg-red-500'
                            )}></div>

                            {/* Numbering */}
                            <div className="shrink-0 w-7 h-7 rounded-full bg-white/50 border border-gray-100 flex items-center justify-center text-[10px] font-black text-gray-400">
                                {index + 1}
                            </div>

                            {/* Info Stacked - 3 Lines */}
                            <div className="flex-1 min-w-0 flex flex-col gap-1">
                                <h3 className={cn(
                                    "font-black text-sm leading-tight",
                                    log.recipientId === 'system' ? "text-indigo-700" : "text-gray-900"
                                )}>
                                    {log.recipientName}
                                </h3>

                                {log.recipientId === 'system' && (
                                    <p className="text-[11px] font-bold text-indigo-500/80 leading-relaxed italic pr-1">
                                        {log.messageSent}
                                    </p>
                                )}

                                <div className="flex items-center gap-1 text-[10px] font-bold text-gray-400">
                                    <Calendar className="w-3 h-3" />
                                    <span>{new Date(log.timestamp).toLocaleDateString('ar-SA', { day: 'numeric', month: 'long' })}</span>
                                    <span className="mx-1">•</span>
                                    <span dir="ltr">{new Date(log.timestamp).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                            </div>

                            {/* Undo Action */}
                            {log.status === 'success' && log.recipientId !== 'system' && (
                                <button
                                    onClick={() => handleUndo(log.id, log.recipientId, log.timestamp)}
                                    className="shrink-0 p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                    title="إلغاء الخصم"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-12 border-2 border-dashed border-gray-100/30 rounded-3xl flex-1 flex flex-col items-center justify-center bg-white/20">
                    <div className="w-16 h-16 bg-white/40 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300 shadow-sm">
                        <Trash2 className="w-8 h-8" />
                    </div>
                    <p className="text-gray-500 font-medium text-sm">لا توجد سجلات لليوم</p>
                </div>
            )}
        </div>
    );

    return (
        <div className="space-y-6 pb-20 p-4 md:p-6" dir="rtl">
            {/* Minimal Navigation Header */}
            <div className="flex items-center justify-between bg-white/60 backdrop-blur-md sticky top-0 z-50 py-3 -mx-4 px-4 md:-mx-6 md:px-6 border-b border-gray-100">
                <div className="flex items-center gap-3">
                    <Link
                        href="/"
                        className="w-10 h-10 flex items-center justify-center bg-white rounded-2xl shadow-sm border border-gray-100 text-gray-400 hover:text-indigo-600 hover:border-indigo-100 transition-all"
                    >
                        <Home className="w-5 h-5" />
                    </Link>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">مركز الشاطبي</span>
                        <h2 className="text-sm font-black text-gray-900 leading-none">نظام الأتمتة</h2>
                    </div>
                </div>

                <div className="flex items-center gap-2 bg-gray-50/80 px-2 py-1.5 rounded-xl border border-gray-100">
                    <span className="text-xs font-bold text-gray-500">عرض نتائج:</span>
                    <div className="relative">
                        <input 
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="bg-white border border-gray-200 text-xs font-bold text-indigo-700 px-2 py-1 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                        />
                        {selectedDate && (
                            <button 
                                onClick={() => setSelectedDate('')}
                                className="mr-2 text-[10px] font-bold text-gray-400 hover:text-red-500 transition-colors"
                            >
                                (الأحدث)
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Action Header - Just Buttons */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-32 h-32 bg-blue-50 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
                <div className="relative z-10 flex flex-row items-center justify-between gap-3">
                    <button
                        onClick={handleRunReportCheck}
                        disabled={isExecuting}
                        className="flex-1 flex flex-col md:flex-row items-center justify-center gap-2 px-4 py-4 md:py-3 bg-indigo-50 text-indigo-700 rounded-2xl font-black text-sm md:text-base hover:bg-indigo-100 transition-all disabled:opacity-50"
                    >
                        <Calendar className="w-5 h-5 mb-1 md:mb-0" />
                        <span>{isExecuting ? 'جاري فحص التقارير...' : 'فحص التقارير'}</span>
                    </button>
                    <button
                        onClick={handleRunExamCheck}
                        disabled={isExecutingExams}
                        className="flex-1 flex flex-col md:flex-row items-center justify-center gap-2 px-4 py-4 md:py-3 bg-emerald-50 text-emerald-700 rounded-2xl font-black text-sm md:text-base hover:bg-emerald-100 transition-all disabled:opacity-50"
                    >
                        <BookOpen className="w-5 h-5 mb-1 md:mb-0" />
                        <span>{isExecutingExams ? 'جاري فحص الاختبارات...' : 'فحص الاختبارات'}</span>
                    </button>
                </div>
            </div>

            {/* Split Logs Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                <div className="h-full">
                    {renderLogList(reportLogs, selectedDate ? `سجل التقارير (${new Date(selectedDate).toLocaleDateString('ar-EG', {month: 'short', day: 'numeric'})})` : "سجل التقارير الأخير", Calendar, "text-indigo-600", "bg-indigo-50/40", "border-indigo-100/60")}
                </div>
                <div className="h-full">
                    {renderLogList(examLogs, selectedDate ? `سجل الاختبارات (${new Date(selectedDate).toLocaleDateString('ar-EG', {month: 'short', day: 'numeric'})})` : "سجل الاختبارات الأخير", BookOpen, "text-emerald-600", "bg-emerald-50/40", "border-emerald-100/60")}
                </div>
            </div>
        </div>
    );
}
