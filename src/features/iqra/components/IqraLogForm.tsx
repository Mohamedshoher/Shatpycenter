import React, { useState, useEffect } from 'react';
import { Plus, Clock, MessageSquare } from 'lucide-react';
import { IqraLog } from '../services/iqraService';

interface IqraLogFormProps {
    course_id: string;
    nextLecture: number;
    onSubmit: (log: Omit<IqraLog, 'id' | 'student_id' | 'created_at'>) => void;
    isSubmitting: boolean;
}

export default function IqraLogForm({ course_id, nextLecture, onSubmit, isSubmitting }: IqraLogFormProps) {
    const [formData, setFormData] = useState({
        lecture_number: nextLecture,
        course_id: course_id,
        general_follow_up_grade: 'ممتاز',
        sheikh_follow_up_day: '', 
        sheikh_follow_up_time: '',
        sheikh_follow_up_grade: 'ممتاز',
        notes: ''
    });

    // تحديث البيانات عند فتح الاستمارة أو تغيير الدورة
    useEffect(() => {
        const now = new Date();
        const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
        const currentDay = days[now.getDay()];
        const currentTime = now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true });

        setFormData(prev => ({ 
            ...prev, 
            course_id, 
            lecture_number: nextLecture,
            sheikh_follow_up_day: currentDay,
            sheikh_follow_up_time: currentTime
        }));
    }, [course_id, nextLecture]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="bg-white rounded-[32px] p-5 md:p-6 border border-gray-100 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-50 rounded-2xl flex items-center justify-center text-green-600">
                        <Plus size={20} />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-gray-900">تسجيل متابعة</h3>
                        <p className="text-xs text-gray-400 font-bold italic">سيتم تسجيل اليوم والوقت تلقائياً ({formData.sheikh_follow_up_day} - {formData.sheikh_follow_up_time})</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* رقم المحاضرة (تلقائي وقابل للتعديل) */}
                <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 pr-1 uppercase">رقم المحاضرة</label>
                    <div className="relative">
                        <input
                            type="number"
                            required
                            value={formData.lecture_number}
                            onChange={(e) => setFormData({ ...formData, lecture_number: parseInt(e.target.value) || 0 })}
                            className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm font-bold outline-none ring-2 ring-transparent focus:ring-green-500/20 transition-all font-mono"
                        />
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] bg-white px-2 py-0.5 rounded-md border border-gray-100 text-gray-400 font-bold">تلقائي</div>
                    </div>
                </div>

                {/* تقدير الشيخ (مع إضافة خيار الإعادة) */}
                <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 pr-1 uppercase">تقدير المتابعة</label>
                    <select
                        value={formData.sheikh_follow_up_grade}
                        onChange={(e) => setFormData({ ...formData, sheikh_follow_up_grade: e.target.value })}
                        className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm font-bold outline-none ring-2 ring-transparent focus:ring-green-500/20 transition-all appearance-none text-green-700"
                    >
                        {['ممتاز', 'جيد جداً', 'جيد', 'مقبول', 'ضعيف', 'يعاد مرة أخرى'].map(g => (
                            <option key={g} value={g} className={g === 'يعاد مرة أخرى' ? 'text-red-500 font-black' : ''}>{g}</option>
                        ))}
                    </select>
                </div>

                {/* الوقت (مخفي ولكن يتم حفظه) */}
                <div className="hidden">
                     <input type="text" value={formData.sheikh_follow_up_day} readOnly />
                     <input type="text" value={formData.sheikh_follow_up_time} readOnly />
                </div>

                {/* الملحوظات */}
                <div className="space-y-1.5 md:col-span-1">
                    <label className="text-[10px] font-black text-gray-400 pr-1 uppercase">ملحوظة (اختياري)</label>
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="اكتب أي ملاحظة..."
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm font-bold outline-none ring-2 ring-transparent focus:ring-green-500/20 transition-all pl-10"
                        />
                        <MessageSquare size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
                    </div>
                </div>
            </div>

            <div className="flex justify-end pt-2">
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-green-600 hover:bg-green-700 disabled:bg-gray-200 text-white px-10 py-3.5 rounded-2xl font-black text-sm shadow-xl shadow-green-100 transition-all active:scale-95 flex items-center gap-2"
                >
                    {isSubmitting ? 'جاري التسجيل...' : 'حفظ المتابعة'}
                </button>
            </div>
        </form>
    );
}
