import { useState } from 'react';
import { Trash2, Pencil, Check, X } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { cn } from '../../../lib/utils';
import { useAuthStore } from '../../../store/useAuthStore';

export default function ExamsTab({ student, records }: any) {
    const { user } = useAuthStore();
    const { exams, addExam, deleteExam, updateExam } = records;
    const [surahName, setSurahName] = useState('');
    const [examType, setExamType] = useState('جديد');
    const [examGrade, setExamGrade] = useState('ممتاز');
    const [activeSubTab, setActiveSubTab] = useState('جديد');

    // حالة التعديل
    const [editingExamId, setEditingExamId] = useState<string | null>(null);
    const [editType, setEditType] = useState('');

    const canEdit = user?.role === 'director' || user?.role === 'teacher' || user?.role === 'supervisor';

    const handleAdd = () => {
        if (!surahName) return alert('أدخل اسم السورة');
        addExam.mutate({
            studentId: student.id,
            surah: surahName,
            type: examType,
            grade: examGrade,
            date: new Date().toISOString().split('T')[0],
        });
        setSurahName('');
    };

    const handleStartEdit = (exam: any) => {
        setEditingExamId(exam.id);
        setEditType(exam.type);
    };

    const handleSaveEdit = (examId: string) => {
        updateExam.mutate({ id: examId, data: { type: editType } });
        setEditingExamId(null);
    };

    const handleCancelEdit = () => setEditingExamId(null);

    const gradeColor = (grade: string) => {
        if (grade === 'ممتاز') return 'bg-green-50 text-green-600 border-green-100/50';
        if (grade === 'يعاد') return 'bg-red-50 text-red-500 border-red-100/50';
        return 'bg-blue-50 text-blue-600 border-blue-100/50';
    };

    return (
        <div className="space-y-4">
            {/* نموذج تسجيل اختبار جديد */}
            <div className="bg-gray-50 p-5 rounded-[24px] border border-gray-100 space-y-4">
                <h4 className="font-bold text-sm">تسجيل اختبار</h4>
                <input
                    type="text"
                    value={surahName}
                    onChange={e => setSurahName(e.target.value)}
                    placeholder="اسم السورة"
                    className="w-full h-11 rounded-xl px-4 text-sm border-gray-100"
                />
                <div className="grid grid-cols-2 gap-3">
                    <select value={examType} onChange={e => setExamType(e.target.value)} className="h-11 rounded-xl text-xs font-bold">
                        <option>جديد</option><option>ماضي قريب</option><option>ماضي بعيد</option>
                    </select>
                    <select value={examGrade} onChange={e => setExamGrade(e.target.value)} className="h-11 rounded-xl text-xs font-bold">
                        <option>ممتاز</option><option>جيد جداً</option><option>جيد</option><option>يعاد</option>
                    </select>
                </div>
                <Button onClick={handleAdd} className="w-full bg-blue-600">حفظ النتيجة</Button>
            </div>

            {/* التبويبات */}
            <div className="flex bg-gray-100 p-1 rounded-xl">
                {['جديد', 'ماضي قريب', 'ماضي بعيد'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveSubTab(tab)}
                        className={cn("flex-1 py-2 text-xs font-bold rounded-lg transition-all", activeSubTab === tab ? "bg-white text-blue-600 shadow-sm" : "text-gray-400")}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* قائمة الاختبارات */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {exams.filter((e: any) => e.type === activeSubTab).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((exam: any) => (
                    <div
                        key={exam.id}
                        className="p-4 bg-white rounded-[24px] border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col gap-3 group"
                    >
                        {/* السطر الأول: البيانات الأساسية وأزرار التحكم */}
                        <div className="flex items-center justify-between">
                            {/* اليمين: اسم السورة والتقدير (بعد العكس) */}
                            <div className="flex items-center gap-2">
                                <span className="font-black text-gray-900 text-sm">{exam.surah}</span>
                                <span className={cn("text-[10px] font-black px-2.5 py-1 rounded-lg border shadow-[0_2px_10px_-3px_rgba(0,0,0,0.07)]", gradeColor(exam.grade))}>
                                    {exam.grade}
                                </span>
                            </div>

                            {/* اليسار: أيقونات التحكم (بعد العكس) */}
                            <div className="flex items-center gap-1 shrink-0">
                                {editingExamId === exam.id ? (
                                    <>
                                        <button
                                            onClick={() => handleSaveEdit(exam.id)}
                                            className="w-7 h-7 bg-green-500 text-white rounded-lg flex items-center justify-center hover:bg-green-600 transition-colors"
                                        >
                                            <Check size={13} />
                                        </button>
                                        <button
                                            onClick={handleCancelEdit}
                                            className="w-7 h-7 bg-gray-200 text-gray-500 rounded-lg flex items-center justify-center hover:bg-gray-300 transition-colors"
                                        >
                                            <X size={13} />
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        {canEdit && (
                                            <button
                                                onClick={() => handleStartEdit(exam)}
                                                className="w-7 h-7 text-blue-400 hover:text-blue-600 flex items-center justify-center rounded-lg hover:bg-blue-50 transition-colors"
                                                title="تغيير النوع"
                                            >
                                                <Pencil size={13} />
                                            </button>
                                        )}
                                        {user?.role === 'director' && (
                                            <button
                                                onClick={() => deleteExam.mutate(exam.id)}
                                                className="w-7 h-7 text-gray-300 hover:text-red-500 flex items-center justify-center rounded-lg hover:bg-red-50 transition-colors"
                                                title="حذف"
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>

                        {/* السطر الثاني: النوع والتاريخ */}
                        <div className="flex items-center justify-between pt-1 border-t border-gray-50">
                            <div className="flex items-center gap-2">
                                {editingExamId === exam.id ? (
                                    <select
                                        value={editType}
                                        onChange={e => setEditType(e.target.value)}
                                        autoFocus
                                        className="text-[10px] font-bold border border-blue-200 rounded-lg px-2 py-0.5 bg-blue-50 text-blue-700 focus:outline-none"
                                    >
                                        <option>جديد</option>
                                        <option>ماضي قريب</option>
                                        <option>ماضي بعيد</option>
                                    </select>
                                ) : (
                                    <span className="text-[10px] font-bold bg-gray-50 text-gray-500 px-2 py-1 rounded-lg border border-gray-100">
                                        {exam.type}
                                    </span>
                                )}
                            </div>
                            <span className="text-[10px] text-gray-400 font-bold">{exam.date}</span>
                        </div>
                    </div>
                ))}

                {exams.filter((e: any) => e.type === activeSubTab).length === 0 && (
                    <div className="col-span-full text-center py-10 text-gray-400 text-xs font-bold">
                        لا توجد اختبارات في هذه الفئة
                    </div>
                )}
            </div>
        </div>
    );
}