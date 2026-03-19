import { useState } from 'react';
import { BookOpen, Trash2 } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { cn } from '../../../lib/utils';
import { useAuthStore } from '../../../store/useAuthStore';

export default function ExamsTab({ student, records }: any) {
    const { user } = useAuthStore();
    const { exams, addExam, deleteExam } = records;
    const [surahName, setSurahName] = useState('');
    const [examType, setExamType] = useState('جديد');
    const [examGrade, setExamGrade] = useState('ممتاز');
    const [activeSubTab, setActiveSubTab] = useState('جديد');

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

    return (
        <div className="space-y-4">
            {/* نموذج تسجيل اختبار جديد */}
            <div className="bg-gray-50 p-5 rounded-[24px] border border-gray-100 space-y-4">
                <h4 className="font-bold text-sm">تسجيل اختبار</h4>
                <input type="text" value={surahName} onChange={e => setSurahName(e.target.value)} placeholder="اسم السورة" className="w-full h-11 rounded-xl px-4 text-sm border-gray-100" />
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

            {/* عرض السجلات السابقة مع تبويبات داخلية */}
            <div className="flex bg-gray-100 p-1 rounded-xl">
                {['جديد', 'ماضي قريب', 'ماضي بعيد'].map(tab => (
                    <button key={tab} onClick={() => setActiveSubTab(tab)} className={cn("flex-1 py-2 text-xs font-bold rounded-lg transition-all", activeSubTab === tab ? "bg-white text-blue-600 shadow-sm" : "text-gray-400")}>{tab}</button>
                ))}
            </div>

            <div className="space-y-3">
                {exams.filter((e: any) => e.type === activeSubTab).map((exam: any) => (
                    <div key={exam.id} className="p-4 bg-white rounded-2xl border border-gray-50 shadow-sm flex justify-between items-center">
                        <div>
                            <h4 className="font-bold text-gray-900">{exam.surah}</h4>
                            <p className="text-[10px] text-gray-400 font-bold">{exam.date}</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className={cn("text-[10px] font-bold px-2 py-1 rounded-lg", exam.grade === 'ممتاز' ? "bg-green-50 text-green-600" : "bg-blue-50 text-blue-600")}>{exam.grade}</span>
                            {user?.role === 'director' && <Trash2 size={16} className="text-gray-300 hover:text-red-500 cursor-pointer" onClick={() => deleteExam.mutate(exam.id)} />}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}