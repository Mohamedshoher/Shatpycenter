import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAllIqraProgress, createIqraProgress, updateIqraProgress, deleteIqraProgress, getIqraLogs, IqraProgress } from '../services/iqraService';
import { Book, Plus, Trash2, Edit3, X, Calendar, User, Award, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useAuthStore } from '../../../store/useAuthStore';
import { supabase } from '@/lib/supabase';

interface IqraCoursesTabProps {
    student: any;
}

export default function IqraCoursesTab({ student }: IqraCoursesTabProps) {
    const queryClient = useQueryClient();
    const { user } = useAuthStore();
    const studentId = student.id;
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // جلب بيانات المجموعات لمعرفة المعلم
    const { data: groups = [] } = useQuery({
        queryKey: ['groups'],
        queryFn: async () => {
            const { data, error } = await supabase.from('groups').select('*, teacher:teachers(name)');
            if (error) throw error;
            return data;
        }
    });

    // جلب كافة الدورات
    const { data: courses = [], isLoading } = useQuery({
        queryKey: ['iqra-courses', studentId],
        queryFn: () => getAllIqraProgress(studentId),
        enabled: !!studentId
    });

    // جلب كافة المتابعات لحساب التقدم والتقدير المتوسط وتاريخ الختم
    const { data: allLogs = [] } = useQuery({
        queryKey: ['iqra-logs-all', studentId],
        queryFn: () => getIqraLogs(studentId),
        enabled: !!studentId
    });

    // دالة لجلب اسم المعلم/المشرف للدورة
    const getSupervisingSheikh = () => {
        if (user?.role === 'director') {
            return `المدير: ${user?.displayName || 'محمد مصطفى شكر'}`;
        }
        const group = groups?.find((g: any) => g.id === student?.groupId);
        return group?.teacher?.name || user?.displayName || '---';
    };

    // دالة لحساب التقدير المتوسط بذكاء
    const calculateAverageGrade = (courseId: string) => {
        const courseLogs = allLogs.filter(l => l.course_id === courseId);
        if (courseLogs.length === 0) return 'لم يحدد';

        const gradeMap: any = { 'ممتاز': 5, 'جيد جداً': 4, 'جيد': 3, 'مقبول': 2, 'ضعيف': 1 };
        const reverseMap: any = { 5: 'ممتاز', 4: 'جيد جداً', 3: 'جيد', 2: 'مقبول', 1: 'ضعيف' };

        const sum = courseLogs.reduce((acc, log) => acc + (gradeMap[log.sheikh_follow_up_grade] || 0), 0);
        const avg = Math.round(sum / courseLogs.length);
        return reverseMap[avg] || 'جيد';
    };

    // دالة لجلب تاريخ آخر متابعة كـ "تاريخ انتهاء"
    const getCompletionDate = (courseId: string) => {
        const courseLogs = allLogs.filter(l => l.course_id === courseId);
        if (courseLogs.length === 0) return null;
        
        // جلب أحدث سجل (بناءً على تاريخ الإنشاء)
        const latestLog = [...courseLogs].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
        return new Date(latestLog.created_at).toLocaleDateString('ar-EG');
    };

    const createMutation = useMutation({
        mutationFn: (data: Partial<IqraProgress>) => createIqraProgress(studentId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['iqra-courses', studentId] });
            setIsAdding(false);
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string, data: Partial<IqraProgress> }) => updateIqraProgress(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['iqra-courses', studentId] });
            setEditingId(null);
        }
    });

    const deleteMutation = useMutation({
        mutationFn: deleteIqraProgress,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['iqra-courses', studentId] });
        }
    });

    if (isLoading) return <div className="py-20 text-center font-bold text-gray-400">جاري التحميل...</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between bg-blue-50/50 p-4 rounded-3xl border border-blue-100/50">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
                        <Book size={20} />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-gray-900">سجل الدورات</h3>
                        <p className="text-xs text-gray-500 font-bold">إدارة الكتب والمواد التعليمية المسجلة</p>
                    </div>
                </div>
                <button 
                    onClick={() => setIsAdding(true)}
                    className="w-10 h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200 transition-all active:scale-95"
                >
                    <Plus size={24} />
                </button>
            </div>

            <AnimatePresence>
                {isAdding && (
                    <CourseForm 
                        onSave={(data: any) => createMutation.mutate(data)} 
                        onCancel={() => setIsAdding(false)}
                        isSubmitting={createMutation.isPending}
                    />
                )}
            </AnimatePresence>

            <div className="grid grid-cols-1 gap-6">
                {courses.length === 0 && !isAdding ? (
                    <div className="py-12 text-center bg-gray-50 rounded-[40px] border-2 border-dashed border-gray-100 italic text-gray-400 font-bold">
                        لا توجد دورات مسجلة بعد
                    </div>
                ) : (
                    courses.map(course => {
                        const courseLogs = allLogs.filter(l => l.course_id === course.id);
                        const latestLecture = courseLogs.length > 0 ? Math.max(...courseLogs.map(l => l.lecture_number)) : 0;
                        const progress = Math.min(Math.round((latestLecture / (course.total_lectures || 1)) * 100), 100);
                        const isFinished = progress >= 100;
                        const avgGrade = calculateAverageGrade(course.id);
                        const sheikhName = getSupervisingSheikh();
                        const completionDate = getCompletionDate(course.id);

                        return (
                            <div key={course.id}>
                                {editingId === course.id ? (
                                    <CourseForm 
                                        initialData={course}
                                        onSave={(data: any) => updateMutation.mutate({ id: course.id, data })}
                                        onCancel={() => setEditingId(null)}
                                        isSubmitting={updateMutation.isPending}
                                    />
                                ) : (
                                    <div className={cn(
                                        "bg-white rounded-[32px] p-6 border transition-all relative group shadow-sm",
                                        isFinished ? "border-green-100 bg-green-50/10" : "border-gray-100 hover:border-blue-200"
                                    )}>
                                        <div className="flex justify-between items-start mb-6">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <h4 className="text-xl font-black text-gray-900">{course.book_name}</h4>
                                                    {isFinished && <CheckCircle size={18} className="text-green-500" />}
                                                </div>
                                                <div className="flex items-center gap-3 text-xs text-gray-500 font-bold">
                                                    <span>بدأ في: {course.start_date || '---'}</span>
                                                    <span className="w-1 h-1 bg-gray-300 rounded-full" />
                                                    <span>{course.total_lectures || 0} محاضرة</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                                <button onClick={() => setEditingId(course.id)} className="w-9 h-9 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all"><Edit3 size={18} /></button>
                                                <button 
                                                    onClick={() => { if(confirm('حذف هذه الدورة؟')) deleteMutation.mutate(course.id); }} 
                                                    className="w-9 h-9 bg-red-50 text-red-600 rounded-xl flex items-center justify-center hover:bg-red-600 hover:text-white transition-all"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </div>

                                        {/* شريط التقدم */}
                                        <div className="mb-6 space-y-2">
                                            <div className="flex justify-between text-[10px] font-black uppercase text-gray-400">
                                                <span>نسبة التقدم</span>
                                                <span>{progress}%</span>
                                            </div>
                                            <div className="h-2.5 bg-gray-50 rounded-full overflow-hidden">
                                                <motion.div 
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${progress}%` }}
                                                    className={cn("h-full", isFinished ? "bg-green-500" : "bg-blue-500")}
                                                />
                                            </div>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                                            <InfoCard label="الحالة" value={course.received_from_sheikh ? 'تم الاستلام' : 'لم يستلم'} color={course.received_from_sheikh ? 'green' : 'gray'} />
                                            <InfoCard label="النوع" value={course.is_free ? 'مجاني' : 'بثمنه'} color={course.is_free ? 'blue' : 'amber'} />
                                            <InfoCard label="الاختبار" value={course.full_exam_date || 'غير محدد'} color="purple" />
                                            <InfoCard label="منجز" value={`${latestLecture} محاضرة`} color="blue" />
                                        </div>

                                        {/* بيانات ذكية محسوبة */}
                                        <div className="pt-4 border-t border-dashed border-gray-100 flex flex-wrap gap-4">
                                            {completionDate && (
                                                <div className="flex items-center gap-2 text-xs font-bold text-gray-500 bg-gray-50 px-3 py-1.5 rounded-xl">
                                                    <Calendar size={14} className="text-blue-500" />
                                                    آخر متابعة: <span className="text-gray-900">{completionDate}</span>
                                                </div>
                                            )}
                                            <div className="flex items-center gap-2 text-xs font-bold text-gray-500 bg-amber-50 px-3 py-1.5 rounded-xl">
                                                <Award size={14} className="text-amber-500" />
                                                التقدير العام: <span className="text-amber-900">{avgGrade}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs font-bold text-gray-500 bg-green-50 px-3 py-1.5 rounded-xl">
                                                <User size={14} className="text-green-500" />
                                                إشراف: <span className="text-green-900">{sheikhName}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}

function CourseForm({ initialData, onSave, onCancel, isSubmitting }: any) {
    const [lecturesPerWeek, setLecturesPerWeek] = useState(2);
    const [data, setData] = useState(initialData || {
        book_name: '',
        start_date: new Date().toISOString().split('T')[0],
        total_lectures: 0,
        received_from_sheikh: false,
        is_free: true,
        full_exam_date: '',
        completed_courses: 0
    });

    // حساب موعد الاختبار تلقائياً عند تغيير عدد المحاضرات أو التاريخ
    useEffect(() => {
        if (data.total_lectures > 0 && data.start_date && lecturesPerWeek > 0) {
            const totalWeeks = data.total_lectures / lecturesPerWeek;
            const totalDays = Math.ceil(totalWeeks * 7);
            const startDate = new Date(data.start_date);
            const endDate = new Date(startDate.getTime() + (totalDays * 24 * 60 * 60 * 1000));
            
            // تحديث التاريخ فقط إذا كان فارغاً أو إذا كان المستخدم يعدل في الخانات المؤثرة
            setData((prev: any) => ({ ...prev, full_exam_date: endDate.toISOString().split('T')[0] }));
        }
    }, [data.total_lectures, data.start_date, lecturesPerWeek]);

    return (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="bg-blue-50/50 rounded-[32px] p-6 border border-blue-100 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-right">
                <Input label="اسم الكتاب" value={data.book_name} onChange={(v: string) => setData({...data, book_name: v})} />
                <Input label="تاريخ البدء" type="date" value={data.start_date} onChange={(v: string) => setData({...data, start_date: v})} />
                <Input label="إجمالي المحاضرات" type="number" value={data.total_lectures} onChange={(v: string) => setData({...data, total_lectures: parseInt(v) || 0})} />
                <Input label="المحاضرات في الأسبوع" type="number" value={lecturesPerWeek} onChange={(v: string) => setLecturesPerWeek(parseInt(v) || 1)} />
                <Input label="موعد الاختبار النهائي" type="date" value={data.full_exam_date} onChange={(v: string) => setData({...data, full_exam_date: v})} />
                
                <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black text-gray-400 pr-1">استلام الكتاب</label>
                    <div className="flex items-center gap-4 bg-white rounded-2xl p-2 border border-gray-100">
                        <button type="button" onClick={() => setData({...data, received_from_sheikh: true})} className={cn("flex-1 py-1.5 rounded-xl text-xs font-bold transition-all", data.received_from_sheikh ? "bg-green-600 text-white" : "text-gray-400")}>نعم</button>
                        <button type="button" onClick={() => setData({...data, received_from_sheikh: false, is_free: true})} className={cn("flex-1 py-1.5 rounded-xl text-xs font-bold transition-all", !data.received_from_sheikh ? "bg-gray-400 text-white" : "text-gray-400")}>لا</button>
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
                <button type="button" onClick={onCancel} className="px-6 py-2.5 rounded-2xl font-black text-sm text-gray-400 hover:text-gray-600 transition-all">إلغاء</button>
                <button 
                    type="button"
                    onClick={() => onSave(data)} 
                    disabled={isSubmitting || !data.book_name}
                    className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-black text-sm shadow-xl shadow-blue-100 transition-all active:scale-95 disabled:opacity-50"
                >
                    {isSubmitting ? 'جاري الحفظ...' : 'حفظ بيانات الدورة'}
                </button>
            </div>
        </motion.div>
    );
}

function Input({ label, type = "text", value, onChange, placeholder }: any) {
    return (
        <div className="space-y-1.5 text-right">
            <label className="text-[10px] font-black text-gray-400 pr-1 uppercase text-right">{label}</label>
            <input 
                type={type} 
                value={value || ''} 
                onChange={(e) => onChange(e.target.value)} 
                placeholder={placeholder}
                className="w-full bg-white border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/10 transition-all"
            />
        </div>
    );
}

function InfoCard({ label, value, color }: { label: string, value: string, color: string }) {
    const colors: any = {
        green: "bg-green-50 text-green-600 border-green-100",
        blue: "bg-blue-50 text-blue-600 border-blue-100",
        amber: "bg-amber-50 text-amber-600 border-amber-100",
        purple: "bg-purple-50 text-purple-600 border-purple-100",
        gray: "bg-gray-50 text-gray-500 border-gray-100",
    };
    return (
        <div className={cn("p-2.5 rounded-2xl border text-center space-y-0.5", colors[color])}>
            <p className="text-[9px] font-black opacity-70 uppercase tracking-tighter">{label}</p>
            <p className="text-xs font-black truncate">{value}</p>
        </div>
    );
}
