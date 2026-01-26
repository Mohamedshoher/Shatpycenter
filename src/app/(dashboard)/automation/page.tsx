'use client';

import { useState } from 'react';
import { useAutomationExecution } from '@/features/automation/hooks/useAutomationExecution';
import { useAutomation } from '@/features/automation/hooks/useAutomation';
import { Play, Calendar, Trash2 } from 'lucide-react';

export default function AutomationPage() {
    const { isExecuting, executeMissingReportDeduction } = useAutomationExecution();
    const { logs, loading: logsLoading, loadLogs } = useAutomation();

    const handleRunCheck = async () => {
        if (confirm("هل أنت متأكد من رغبتك في تشغيل فحص الغياب والتقارير لليوم وتطبيق الخصومات على المخالفين؟")) {
            const result = await executeMissingReportDeduction();
            if (result && result.length > 0) {
                alert(`✅ تمت العملية بنجاح! تم تسجيل ${result.length} مخالفة.`);
                loadLogs(); // Refresh logs
            } else {
                alert("✨ تم الفحص: لم يتم العثور على مخالفات جديدة اليوم.");
            }
        }
    };

    return (
        <div className="space-y-6 pb-10 p-4 md:p-6" dir="rtl">
            {/* Header */}
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-32 h-32 bg-blue-50 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
                <div className="relative z-10">
                    <h1 className="text-3xl font-black text-gray-900 mb-2">
                        نظام الأتمتة الذكي
                    </h1>
                    <p className="text-gray-500 font-medium">
                        إدارة الخصومات التلقائية ومراقبة الانضباط بضغطة زر
                    </p>
                </div>
            </div>

            {/* Action Card */}
            <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-3xl p-8 text-white shadow-xl shadow-indigo-200">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex-1">
                        <h2 className="text-2xl font-bold mb-2 flex items-center gap-3">
                            <Calendar className="w-8 h-8 text-indigo-200" />
                            فحص التقارير اليومية
                        </h2>
                        <p className="text-indigo-100 leading-relaxed max-w-2xl">
                            يقوم هذا النظام بفحص جميع المعلمين النشطين. إذا وجد معلماً لم يقم بتسجيل حضور طلابه لهذا اليوم، ولم يكن مسجلاً كحاضر أو معتذر، سيتم تطبيق خصم ربع يوم عليه وإرسال رسالة تنبيهية له فوراً.
                        </p>
                    </div>
                    <button
                        onClick={handleRunCheck}
                        disabled={isExecuting}
                        className={`
              px-8 py-4 bg-white text-indigo-700 rounded-2xl font-black text-lg 
              shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center gap-3
              ${isExecuting ? 'opacity-70 cursor-wait' : ''}
            `}
                    >
                        {isExecuting ? (
                            <>
                                <div className="w-6 h-6 border-4 border-indigo-200 border-t-indigo-700 rounded-full animate-spin" />
                                جاري الفحص...
                            </>
                        ) : (
                            <>
                                <Play className="w-6 h-6 fill-current" />
                                تشغيل الفحص الآن
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Logs Section */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-900">سجل العمليات الأخيرة</h2>
                    <span className="text-xs font-bold bg-gray-100 text-gray-500 px-3 py-1 rounded-full">
                        آخر {logs.length} عملية
                    </span>
                </div>

                {logsLoading ? (
                    <div className="text-center py-12 text-gray-400">جاري تحميل السجل...</div>
                ) : logs.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-right">
                            <thead>
                                <tr className="border-b border-gray-100 text-gray-400 text-xs font-bold uppercase tracking-wider">
                                    <th className="pb-3 pr-4">الوقت</th>
                                    <th className="pb-3">المعلم</th>
                                    <th className="pb-3">الرسالة / الإجراء</th>
                                    <th className="pb-3 pl-4 text-left">الحالة</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {logs.map((log) => (
                                    <tr key={log.id} className="group hover:bg-gray-50/50 transition-colors">
                                        <td className="py-4 pr-4 text-sm text-gray-500 font-medium">
                                            {new Date(log.timestamp).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                                            <div className="text-[10px] text-gray-400">
                                                {new Date(log.timestamp).toLocaleDateString('ar-SA')}
                                            </div>
                                        </td>
                                        <td className="py-4 text-sm font-bold text-gray-900">
                                            {log.recipientName}
                                        </td>
                                        <td className="py-4 text-sm text-gray-600 max-w-md truncate">
                                            {log.messageSent}
                                        </td>
                                        <td className="py-4 pl-4 text-left">
                                            <span className={`
                        inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                        ${log.status === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}
                      `}>
                                                {log.status === 'success' ? 'تم بنجاح' : 'فشل'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
                            <Trash2 className="w-8 h-8" />
                        </div>
                        <p className="text-gray-500 font-medium">لا توجد سجلات عمليات حديثة</p>
                    </div>
                )}
            </div>
        </div>
    );
}
