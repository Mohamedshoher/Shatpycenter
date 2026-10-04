'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAutomationExecution } from '@/features/automation/hooks/useAutomationExecution';
import { useAutomation } from '@/features/automation/hooks/useAutomation';
import Calendar from 'lucide-react/dist/esm/icons/calendar'
import Trash2 from 'lucide-react/dist/esm/icons/trash-2'
import BookOpen from 'lucide-react/dist/esm/icons/book-open'
import Layers from 'lucide-react/dist/esm/icons/layers'
import Home from 'lucide-react/dist/esm/icons/home';
import { cn } from '@/lib/utils';

export default function AutomationPage() {
    const { isExecuting, isExecutingExams, executeMissingReportDeduction, executeMissingExamDeduction } = useAutomationExecution();
    const { logs, loading: logsLoading, loadLogs, undoLogAction } = useAutomation();

    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
    const defaultCheckDate = yesterday.toISOString().split('T')[0];
    const [checkDate, setCheckDate] = useState<string>(defaultCheckDate);
    const [isExecutingBoth, setIsExecutingBoth] = useState(false);

    useEffect(() => {
        loadLogs('');
    }, [loadLogs]);

    const handleUndo = async (logId: string, teacherId: string, timestamp: Date) => {
        try {
            await undoLogAction(logId, teacherId, timestamp);
        } catch (e) {
            console.error("Undo failed:", e);
        }
    };

    const checkDateDisplay = new Date(checkDate + 'T12:00:00').toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' });

    const reportViolationsAlert = (violators: unknown[]) => {
        if (violators.length > 0) {
            alert(`✅ تمت العملية بنجاح! تم تسجيل ${violators.length} مخالفة ليوم ${checkDateDisplay}.`);
        } else {
            alert(`✨ تم الفحص ليوم ${checkDateDisplay}: لم يتم العثور على مخالفات جديدة.`);
        }
    };

    const handleRunReportCheck = async () => {
        if (confirm(`هل أنت متأكد من رغبتك في تشغيل فحص التقارير ليوم ${checkDateDisplay} وتطبيق الخصومات على المخالفين؟`)) {
            const result = await executeMissingReportDeduction(checkDate);
            await loadLogs('');
            reportViolationsAlert((result || []).filter((r) => r.recipientId !== 'system'));
        }
    };

    const handleRunExamCheck = async () => {
        if (confirm(`هل أنت متأكد من رغبتك في تشغيل فحص الاختبارات ليوم ${checkDateDisplay} وتطبيق الخصومات على المخالفين؟`)) {
            const result = await executeMissingExamDeduction(checkDate);
            await loadLogs('');
            reportViolationsAlert((result || []).filter((r) => r.recipientId !== 'system'));
        }
    };

    const handleRunBothChecks = async () => {
        if (confirm(`هل أنت متأكد من رغبتك في تشغيل فحص التقارير والاختبارات معاً ليوم ${checkDateDisplay} وتطبيق الخصومات على المخالفين؟`)) {
            setIsExecutingBoth(true);
            try {
                const reportResult = await executeMissingReportDeduction(checkDate);
                const examResult = await executeMissingExamDeduction(checkDate);
                await loadLogs('');
                const violators = [...(reportResult || []), ...(examResult || [])].filter((r) => r.recipientId !== 'system');
                reportViolationsAlert(violators);
            } finally {
                setIsExecutingBoth(false);
            }
        }
    };

    const isAnyExecuting = isExecuting || isExecutingExams || isExecutingBoth;

    const lastReportTimestamp = Math.max(
        ...logs
            .filter(log => log.ruleName?.includes('تقارير') || log.ruleName?.includes('تقرير'))
            .map(log => new Date(log.timestamp).getTime()),
        0
    );
    const lastExamTimestamp = Math.max(
        ...logs
            .filter(log => log.ruleName?.includes('اختبار'))
            .map(log => new Date(log.timestamp).getTime()),
        0
    );

    const reportLogs = logs.filter(log =>
        (log.ruleName?.includes('تقارير') || log.ruleName?.includes('تقرير')) &&
        new Date(log.timestamp).getTime() === lastReportTimestamp
    );
    const examLogs = logs.filter(log =>
        log.ruleName?.includes('اختبار') &&
        new Date(log.timestamp).getTime() === lastExamTimestamp
    );

    const renderLogList = (items: typeof logs, title: string, Icon: React.ComponentType<{ className?: string }>, colorClass: string, bgClass: string, borderClass: string) => (
        <div className={`rounded-3xl p-4 md:p-6 shadow-sm border ${borderClass} h-full flex flex-col ${bgClass}`}>
            <div className="flex items-center justify-between gap-2 mb-4 md:mb-6">
                <div className="flex items-center gap-2 md:gap-3 min-w-0">
                    <div className={`shrink-0 p-2 md:p-2.5 rounded-xl shadow-sm ${colorClass} bg-white border border-current/10`}>
                        <Icon className="w-4 h-4 md:w-5 md:h-5" />
                    </div>
                    <h2 className="text-sm md:text-xl font-bold text-gray-900 truncate">{title}</h2>
                </div>
                <span className={`shrink-0 text-[10px] md:text-xs font-black px-2.5 md:px-3 py-1 rounded-full ${colorClass} bg-white shadow-sm border border-current/10`}>
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
        <div className="space-y-4 md:space-y-6 pb-20 p-3 md:p-6 overflow-x-hidden" dir="rtl">
            {/* Minimal Navigation Header */}
            <div className="flex items-center gap-3 bg-white/60 backdrop-blur-md sticky top-0 z-50 py-3 -mx-3 px-3 md:-mx-6 md:px-6 border-b border-gray-100">
                <Link
                    href="/"
                    className="w-10 h-10 shrink-0 flex items-center justify-center bg-white rounded-2xl shadow-sm border border-gray-100 text-gray-400 hover:text-indigo-600 hover:border-indigo-100 transition-all"
                >
                    <Home className="w-5 h-5" />
                </Link>
                <div className="flex flex-col min-w-0">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest truncate">مركز الشاطبي</span>
                    <h2 className="text-sm font-black text-gray-900 leading-none truncate">نظام الأتمتة</h2>
                </div>
            </div>

            {/* Main Action Header - Shared date + 3 buttons */}
            <div className="bg-white rounded-3xl p-4 md:p-6 shadow-sm border border-gray-100 relative overflow-hidden space-y-4">
                <div className="absolute top-0 left-0 w-32 h-32 bg-blue-50 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>

                <div className="relative z-10 flex items-center gap-2 bg-gray-50/80 px-3 py-2 rounded-xl border border-gray-100 w-full md:w-fit">
                    <span className="text-xs font-bold text-gray-500 shrink-0">تاريخ الفحص:</span>
                    <input
                        type="date"
                        value={checkDate}
                        onChange={(e) => setCheckDate(e.target.value)}
                        className="flex-1 md:flex-none bg-white border border-gray-200 text-xs font-bold text-gray-700 px-2 py-1.5 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                    />
                </div>

                <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                        onClick={handleRunReportCheck}
                        disabled={isAnyExecuting}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-50 text-indigo-700 rounded-2xl font-black text-sm hover:bg-indigo-100 transition-all disabled:opacity-50"
                    >
                        <Calendar className="w-5 h-5 shrink-0" />
                        <span>{isExecuting ? 'جاري الفحص...' : 'فحص التقارير'}</span>
                    </button>

                    <button
                        onClick={handleRunExamCheck}
                        disabled={isAnyExecuting}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-50 text-emerald-700 rounded-2xl font-black text-sm hover:bg-emerald-100 transition-all disabled:opacity-50"
                    >
                        <BookOpen className="w-5 h-5 shrink-0" />
                        <span>{isExecutingExams ? 'جاري فحص الاختبارات...' : 'فحص الاختبارات'}</span>
                    </button>

                    <button
                        onClick={handleRunBothChecks}
                        disabled={isAnyExecuting}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-violet-50 text-violet-700 rounded-2xl font-black text-sm hover:bg-violet-100 transition-all disabled:opacity-50"
                    >
                        <Layers className="w-5 h-5 shrink-0" />
                        <span>{isExecutingBoth ? 'جاري فحص الاثنين...' : 'التقارير والاختبارات معاً'}</span>
                    </button>
                </div>
            </div>

            {/* Split Logs Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                <div className="h-full">
                    {renderLogList(reportLogs, "سجل التقارير الأخير", Calendar, "text-indigo-600", "bg-indigo-50/40", "border-indigo-100/60")}
                </div>
                <div className="h-full">
                    {renderLogList(examLogs, "سجل الاختبارات الأخير", BookOpen, "text-emerald-600", "bg-emerald-50/40", "border-emerald-100/60")}
                </div>
            </div>
        </div>
    );
}
