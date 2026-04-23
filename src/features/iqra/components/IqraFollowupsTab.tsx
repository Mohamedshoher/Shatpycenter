import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getIqraLogs, addIqraLog, deleteIqraLog, getAllIqraProgress, IqraLog } from '../services/iqraService';
import IqraLogForm from './IqraLogForm';
import IqraHistoryList from './IqraHistoryList';
import { Clock, Plus, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../../store/useAuthStore';
import { supabase } from '@/lib/supabase';

interface IqraFollowupsTabProps {
    student: any;
}

export default function IqraFollowupsTab({ student }: IqraFollowupsTabProps) {
    const queryClient = useQueryClient();
    const { user } = useAuthStore();
    const studentId = student.id;
    const [selectedCourseId, setSelectedCourseId] = useState<string>('');
    const [isAdding, setIsAdding] = useState(false);

    // جلب بيانات المجموعات لمعرفة المعلم (المسؤول)
    const { data: groups = [] } = useQuery({
        queryKey: ['groups'],
        queryFn: async () => {
            const { data, error } = await supabase.from('groups').select('*, teacher:teachers(name)');
            if (error) throw error;
            return data;
        }
    });

    // جلب كافة الدورات
    const { data: courses = [] } = useQuery({
        queryKey: ['iqra-courses', studentId],
        queryFn: () => getAllIqraProgress(studentId),
        enabled: !!studentId
    });

    // جلب المتابعات للدورة المحددة
    const { data: logs = [], isLoading } = useQuery({
        queryKey: ['iqra-logs', studentId, selectedCourseId],
        queryFn: () => getIqraLogs(studentId, selectedCourseId),
        enabled: !!studentId
    });

    // تحديد اسم المسؤول للعرض في السجل
    const supervisorName = useMemo(() => {
        if (user?.role === 'director') {
            return `المدير: ${user?.displayName || 'محمد مصطفى شكر'}`;
        }
        const group = groups?.find((g: any) => g.id === student?.groupId);
        return `المسؤول: ${group?.teacher?.name || '---'}`;
    }, [user, groups, student]);

    // الدورة المختارة حالياً
    const selectedCourse = useMemo(() => {
        return courses.find(c => c.id === selectedCourseId) || (courses.length > 0 ? courses[0] : null);
    }, [courses, selectedCourseId]);

    // تحديث الاختيار التلقائي لأول دورة إذا لم يتم الاختيار
    React.useEffect(() => {
        if (!selectedCourseId && courses.length > 0) {
            setSelectedCourseId(courses[0].id);
        }
    }, [courses, selectedCourseId]);

    // حساب التقدم
    const stats = useMemo(() => {
        if (!selectedCourse) return { progress: 0, remaining: 0, latestLecture: 0 };
        const latestLecture = logs.length > 0 ? Math.max(...logs.map(l => l.lecture_number)) : 0;
        const total = selectedCourse.total_lectures || 1;
        const progress = Math.min(Math.round((latestLecture / total) * 100), 100);
        const remaining = Math.max(total - latestLecture, 0);
        return { progress, remaining, latestLecture };
    }, [selectedCourse, logs]);

    const addLogMutation = useMutation({
        mutationFn: (log: Omit<IqraLog, 'id' | 'student_id' | 'created_at'>) => addIqraLog(studentId, log),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['iqra-logs', studentId, selectedCourseId] });
            setIsAdding(false);
        }
    });

    const deleteLogMutation = useMutation({
        mutationFn: deleteIqraLog,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['iqra-logs', studentId, selectedCourseId] });
        }
    });

    if (courses.length === 0) {
        return (
            <div className="py-20 text-center bg-gray-50 rounded-[40px] border-2 border-dashed border-gray-100 italic text-gray-400 font-bold">
                يجب تسجيل دورة أولاً في "سجل الدورات" لتتمكن من إضافة متابعات
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* رأس الصفحة واختيار الدورة */}
            <div className="bg-white rounded-[40px] p-6 border border-gray-100 shadow-sm space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-green-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-green-100">
                            <Clock size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-gray-900">متابعة الدورة</h3>
                            <div className="flex items-center gap-1.5 text-xs text-gray-500 font-bold">
                                <span>اختر الدورة للمتابعة:</span>
                                <select 
                                    value={selectedCourseId} 
                                    onChange={(e) => setSelectedCourseId(e.target.value)}
                                    className="bg-gray-50 border-none rounded-lg px-2 py-1 outline-none text-green-600 font-black cursor-pointer"
                                >
                                    {courses.map(c => <option key={c.id} value={c.id}>{c.book_name}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    <button 
                        onClick={() => setIsAdding(!isAdding)}
                        className={`px-6 py-3 rounded-2xl font-black text-sm flex items-center gap-2 transition-all shadow-lg active:scale-95 ${isAdding ? 'bg-gray-100 text-gray-500' : 'bg-green-600 text-white shadow-green-100'}`}
                    >
                        {isAdding ? <X size={20} /> : <Plus size={20} />}
                        {isAdding ? 'إلغاء' : 'تسجيل متابعة'}
                    </button>
                </div>

                {/* شريط التقدم والبيانات الرقمية */}
                {selectedCourse && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-gray-50">
                        <div className="md:col-span-2 space-y-3">
                            <div className="flex justify-between items-end">
                                <span className="text-sm font-black text-gray-700">نسبة الإنجاز</span>
                                <span className="text-lg font-black text-green-600">{stats.progress}%</span>
                            </div>
                            <div className="h-4 bg-gray-100 rounded-full overflow-hidden relative">
                                <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${stats.progress}%` }}
                                    className="absolute inset-y-0 right-0 bg-green-500 rounded-full transition-all duration-1000"
                                />
                            </div>
                            <p className="text-[10px] text-gray-400 font-bold text-left">
                                تم إنجاز {stats.latestLecture} من أصل {selectedCourse.total_lectures} محاضرة
                            </p>
                        </div>
                        <div className="flex items-center justify-around bg-green-50/50 rounded-3xl p-4 border border-green-100/30">
                            <div className="text-center">
                                <p className="text-[10px] font-black text-green-600/60 uppercase">متبقي</p>
                                <p className="text-2xl font-black text-green-700">{stats.remaining}</p>
                            </div>
                            <div className="w-px h-8 bg-green-200" />
                            <div className="text-center">
                                <p className="text-[10px] font-black text-green-600/60 uppercase">المستوى</p>
                                <p className="text-lg font-black text-green-700">
                                    {stats.progress > 80 ? 'ممتاز' : stats.progress > 50 ? 'جيد جداً' : 'مبتدئ'}
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <AnimatePresence>
                {isAdding && selectedCourseId && (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
                        <IqraLogForm 
                            course_id={selectedCourseId}
                            nextLecture={stats.latestLecture + 1}
                            onSubmit={(log) => addLogMutation.mutate(log)} 
                            isSubmitting={addLogMutation.isPending} 
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            {isLoading ? (
                <div className="py-10 text-center font-bold text-gray-400 italic">جاري تحميل سجل المتابعة...</div>
            ) : (
                <IqraHistoryList 
                    logs={logs} 
                    supervisorName={supervisorName}
                    onDelete={(id) => deleteLogMutation.mutate(id)} 
                />
            )}
        </div>
    );
}
