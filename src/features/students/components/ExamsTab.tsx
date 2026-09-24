import { useState, useCallback } from 'react';
import Trash2    from 'lucide-react/dist/esm/icons/trash-2';
import Pencil    from 'lucide-react/dist/esm/icons/pencil';
import Check     from 'lucide-react/dist/esm/icons/check';
import X         from 'lucide-react/dist/esm/icons/x';
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down';
import ChevronUp   from 'lucide-react/dist/esm/icons/chevron-up';
import Target    from 'lucide-react/dist/esm/icons/target';
import Plus      from 'lucide-react/dist/esm/icons/plus';
import CalendarDays from 'lucide-react/dist/esm/icons/calendar-days';
import BookOpen  from 'lucide-react/dist/esm/icons/book-open';
import CheckCircle from 'lucide-react/dist/esm/icons/check-circle';
import { Button } from '../../../components/ui/button';
import { cn } from '../../../lib/utils';
import { useAuthStore } from '../../../store/useAuthStore';
import type { ExamGoal } from '../services/recordsService';

type ExamType = 'جديد' | 'ماضي قريب' | 'ماضي بعيد';
const EXAM_TYPES: ExamType[] = ['جديد', 'ماضي قريب', 'ماضي بعيد'];

const TYPE_CONFIG: Record<ExamType, {
    color: string; bg: string; border: string;
    activeBg: string; headerBg: string; listBg: string; tabActive: string;
}> = {
    'جديد':      {
        color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200',
        activeBg: 'bg-blue-600', headerBg: 'bg-blue-600', listBg: 'bg-blue-50/60',
        tabActive: 'bg-blue-600 text-white shadow-md shadow-blue-200',
    },
    'ماضي قريب': {
        color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200',
        activeBg: 'bg-amber-500', headerBg: 'bg-amber-500', listBg: 'bg-amber-50/60',
        tabActive: 'bg-amber-500 text-white shadow-md shadow-amber-200',
    },
    'ماضي بعيد': {
        color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200',
        activeBg: 'bg-purple-600', headerBg: 'bg-purple-600', listBg: 'bg-purple-50/60',
        tabActive: 'bg-purple-600 text-white shadow-md shadow-purple-200',
    },
};

const today = () => new Date().toISOString().split('T')[0];

function calcEndDate(startDate: string, sessions: number): string {
    if (!startDate || sessions <= 0) return '';
    const date = new Date(startDate);
    let count = 0;
    
    if (date.getDay() !== 4 && date.getDay() !== 5) {
        count = 1;
    }
    
    while (count < sessions) {
        date.setDate(date.getDate() + 1);
        const day = date.getDay();
        if (day !== 4 && day !== 5) count++;
    }
    
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().split('T')[0];
}

function daysLeft(endDate: string) {
    const diff = Math.ceil((new Date(endDate).getTime() - Date.now()) / 86400000);
    if (diff < 0) return { label: `تأخر ${Math.abs(diff)} يوم`, cls: 'text-red-500 bg-red-50 border-red-200' };
    if (diff === 0) return { label: 'آخر يوم!', cls: 'text-orange-500 bg-orange-50 border-orange-200' };
    return { label: `${diff} يوم متبق`, cls: 'text-green-600 bg-green-50 border-green-200' };
}

const fmt = (d: string) =>
    d ? new Date(d).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' }) : '';

const gradeColor = (grade: string) => {
    if (grade === 'ممتاز') return 'bg-green-100 text-green-700 border-green-200';
    if (grade === 'يعاد')  return 'bg-red-100 text-red-600 border-red-200';
    return 'bg-blue-100 text-blue-700 border-blue-200';
};

export default function ExamsTab({ student, records }: any) {
    const { user } = useAuthStore();
    const { exams, addExam, deleteExam, updateExam, goals, addGoal, updateGoal, deleteGoal } = records;
    const canEdit = user?.role === 'director' || user?.role === 'teacher' || user?.role === 'supervisor';

    // ── التبويب النشط ──
    const [activeTab, setActiveTab] = useState<ExamType>('جديد');

    // ── الأهداف المفتوحة ──
    const [expandedGoals, setExpandedGoals] = useState<Record<string, boolean>>({});
    const toggleGoal = (id: string) =>
        setExpandedGoals(p => ({ ...p, [id]: !p[id] }));
    
    const [showUnclassified, setShowUnclassified] = useState(false);

    // ── مودال تسجيل اختبار ──
    const [examModal, setExamModal] = useState<{ open: boolean; type: ExamType; goalId: string } | null>(null);
    const [surahName, setSurahName] = useState('');
    const [examGrade, setExamGrade] = useState('ممتاز');
    const [examDate, setExamDate]   = useState(today());

    // ── تعديل نوع الاختبار ──
    const [editingExamId, setEditingExamId] = useState<string | null>(null);
    const [editType, setEditType] = useState('');

    // ── مودال الهدف (إضافة / تعديل) ──
    const [goalModal, setGoalModal] = useState<{ open: boolean; type: ExamType; editing: ExamGoal | null } | null>(null);
    const [goalTitle,    setGoalTitle]    = useState('');
    const [goalStart,    setGoalStart]    = useState(today());
    const [goalEnd,      setGoalEnd]      = useState('');
    const [goalSessions, setGoalSessions] = useState<number | ''>('');

    // ── مودال إنهاء الهدف ──
    const [completeModal, setCompleteModal] = useState<ExamGoal | null>(null);
    const [completedByName, setCompletedByName] = useState('');

    // ── فتح مودال الاختبار ──
    const openExamModal = (type: ExamType, goalId: string) => {
        setSurahName(''); setExamDate(today()); setExamGrade('ممتاز');
        setExamModal({ open: true, type, goalId });
        // افتح قائمة الهدف تلقائياً
        setExpandedGoals(p => ({ ...p, [goalId]: true }));
    };

    // ── حفظ الاختبار ──
    const handleAddExam = () => {
        if (!examModal) return;
        if (!surahName.trim()) return alert('أدخل اسم السورة');
        addExam.mutate({
            studentId: student.id,
            surah: surahName,
            type: examModal.type,
            grade: examGrade,
            date: examDate,
            goalId: examModal.goalId,
        });
        setExamModal(null);
    };

    const handleStartEdit  = (exam: any) => { setEditingExamId(exam.id); setEditType(exam.type); };
    const handleSaveEdit   = (id: string) => { updateExam.mutate({ id, data: { type: editType } }); setEditingExamId(null); };
    const handleCancelEdit = () => setEditingExamId(null);

    // ── فتح مودال الهدف ──
    const openGoalModal = useCallback((type: ExamType, existing: ExamGoal | null = null) => {
        setGoalModal({ open: true, type, editing: existing });
        setGoalTitle(existing?.title || '');
        setGoalStart(existing?.startDate || today());
        setGoalSessions(existing?.sessionsCount ?? '');
        setGoalEnd(existing?.endDate || '');
    }, []);

    const handleSessionsChange = (val: string) => {
        const n = val === '' ? '' : Math.max(1, parseInt(val) || 1);
        setGoalSessions(n);
        if (n !== '' && goalStart) setGoalEnd(calcEndDate(goalStart, n as number));
    };

    const handleGoalStartChange = (val: string) => {
        setGoalStart(val);
        if (goalSessions !== '' && val) setGoalEnd(calcEndDate(val, goalSessions as number));
    };

    const handleSaveGoal = () => {
        if (!goalModal) return;
        if (!goalTitle.trim()) return alert('أدخل عنوان الهدف');
        if (!goalEnd) return alert('أدخل تاريخ النهاية أو عدد الحصص');
        const payload = {
            studentId: student.id,
            examType: goalModal.type,
            title: goalTitle,
            startDate: goalStart,
            endDate: goalEnd,
            sessionsCount: goalSessions === '' ? undefined : goalSessions as number,
        };
        if (goalModal.editing) {
            updateGoal.mutate({ id: goalModal.editing.id, data: payload });
        } else {
            addGoal.mutate(payload);
        }
        setGoalModal(null);
    };

    // ── إنهاء الهدف ──
    const handleCompleteGoal = () => {
        if (!completeModal) return;
        if (!completedByName.trim()) return alert('أدخل اسم المعلم/المعلمة');
        updateGoal.mutate({
            id: completeModal.id,
            data: {
                isCompleted: true,
                completedBy: completedByName.trim(),
                completedAt: new Date().toISOString(),
            },
        });
        setCompleteModal(null);
        setCompletedByName('');
    };

    // ── الأهداف حسب النوع النشط ──
    const activeGoals: ExamGoal[] = goals.filter((g: ExamGoal) => g.examType === activeTab);
    const activeGoalCount = (type: ExamType) => goals.filter((g: ExamGoal) => g.examType === type).length;
    const cfg = TYPE_CONFIG[activeTab];

    // ── الاختبارات غير المصنفة (التي لا يوجد هدف من نفس نوعها) ──
    const unclassifiedExams = exams
        .filter((e: any) => !e.goalId && e.type === activeTab)
        .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return (
        <div className="space-y-4">

            {/* ═══ تبويبات الأنواع ═══ */}
            <div className="flex gap-2 bg-gray-100 p-1.5 rounded-2xl">
                {EXAM_TYPES.map(type => {
                    const c = TYPE_CONFIG[type];
                    const goalCount = activeGoalCount(type);
                    const examCount = exams.filter((e: any) => e.type === type).length;
                    const isActive = activeTab === type;
                    return (
                        <button
                            key={type}
                            onClick={() => setActiveTab(type)}
                            className={cn(
                                "flex-1 py-2.5 px-2 rounded-xl text-xs font-black transition-all duration-200 flex flex-col items-center gap-1",
                                isActive ? c.tabActive : "text-gray-400 hover:text-gray-600"
                            )}
                        >
                            <span>{type}</span>
                            <div className="flex items-center gap-1">
                                <span className={cn(
                                    "text-[9px] px-1.5 py-0.5 rounded-full font-bold",
                                    isActive ? "bg-white/25 text-white" : "bg-gray-200 text-gray-400"
                                )}>
                                    {goalCount} هدف
                                </span>
                                <span className={cn(
                                    "text-[9px] px-1.5 py-0.5 rounded-full font-bold",
                                    isActive ? "bg-white/20 text-white" : "bg-gray-200 text-gray-400"
                                )}>
                                    {examCount} اختبار
                                </span>
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* زر إضافة هدف جديد (في الأعلى) */}
            {canEdit && (
                <button
                    onClick={() => openGoalModal(activeTab)}
                    className={cn(
                        "w-full py-3 rounded-2xl border-2 border-dashed text-sm font-bold flex items-center justify-center gap-2 transition-all hover:border-solid",
                        cfg.color, cfg.border, cfg.bg, "hover:bg-white"
                    )}
                >
                    <Plus size={15} />
                    إضافة هدف جديد في "{activeTab}"
                </button>
            )}

            {/* ═══ قائمة الأهداف للنوع النشط ═══ */}
            <div className="space-y-3">
                {activeGoals.length === 0 && (
                    <div className={cn("rounded-2xl border-2 border-dashed p-6 text-center", cfg.border)}>
                        <Target size={28} className={cn("mx-auto mb-2 opacity-40", cfg.color)} />
                        <p className="text-sm font-bold text-gray-400">لا توجد أهداف لهذا النوع بعد</p>
                        <p className="text-xs text-gray-300 mt-1">أضف هدفاً لتبدأ تسجيل الاختبارات</p>
                    </div>
                )}

                {activeGoals.map((goal: ExamGoal) => {
                    const goalExams = exams
                        .filter((e: any) => e.goalId === goal.id)
                        .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
                    const isOpen = expandedGoals[goal.id] ?? false;
                    const dl = goal.isCompleted ? null : daysLeft(goal.endDate);

                    return (
                        <div
                            key={goal.id}
                            className={cn(
                                "rounded-[22px] border overflow-hidden shadow-sm transition-all",
                                goal.isCompleted ? "border-green-300" : cfg.border
                            )}
                        >
                            {/* ── رأس الهدف ── */}
                            <div className={cn(
                                "p-4",
                                goal.isCompleted ? "bg-green-600" : cfg.headerBg
                            )}>
                                {/* السطر الأول */}
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center shrink-0">
                                            {goal.isCompleted
                                                ? <CheckCircle size={14} className="text-white" />
                                                : <Target size={14} className="text-white" />
                                            }
                                        </div>
                                        <p className="text-white font-black text-sm truncate">{goal.title}</p>
                                    </div>

                                    {/* أزرار التحكم */}
                                    <div className="flex items-center gap-1 shrink-0">
                                        {canEdit && !goal.isCompleted && (
                                            <>
                                                {/* زر إضافة اختبار */}
                                                <button
                                                    onClick={() => openExamModal(activeTab, goal.id)}
                                                    className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1.5 rounded-lg bg-white text-gray-700 hover:bg-white/90 transition-colors shadow-sm"
                                                >
                                                    <Plus size={11} /> اختبار
                                                </button>
                                                {/* زر إنهاء الهدف */}
                                                <button
                                                    onClick={() => { setCompleteModal(goal); setCompletedByName(user?.teacherName || user?.displayName || ''); }}
                                                    className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors"
                                                    title="وضع علامة إنهاء"
                                                >
                                                    <CheckCircle size={11} /> إنهاء
                                                </button>
                                                {/* تعديل */}
                                                <button
                                                    onClick={() => openGoalModal(activeTab, goal)}
                                                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors"
                                                    title="تعديل الهدف"
                                                >
                                                    <Pencil size={12} />
                                                </button>
                                            </>
                                        )}
                                        {/* حذف */}
                                        {user?.role === 'director' && (
                                            <button
                                                onClick={() => { if (confirm('حذف الهدف وكل اختباراته؟')) deleteGoal.mutate(goal.id); }}
                                                className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/20 hover:bg-red-400/60 text-white transition-colors"
                                                title="حذف"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        )}
                                        {/* فتح / إغلاق */}
                                        <button
                                            onClick={() => toggleGoal(goal.id)}
                                            className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors"
                                        >
                                            {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                        </button>
                                    </div>
                                </div>

                                {/* معلومات الهدف */}
                                <div className="mt-3 bg-white/15 rounded-xl p-3 space-y-2">
                                    {goal.isCompleted ? (
                                        <div className="flex items-center gap-2">
                                            <CheckCircle size={14} className="text-white" />
                                            <span className="text-white font-black text-xs">
                                                تم الإنهاء بواسطة: {goal.completedBy}
                                            </span>
                                            {goal.completedAt && (
                                                <span className="text-white/60 text-[10px] font-bold mr-auto">
                                                    {fmt(goal.completedAt.split('T')[0])}
                                                </span>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                                            <span className="flex items-center gap-1 text-white/80 text-[10px] font-bold">
                                                <CalendarDays size={10} /> {fmt(goal.startDate)}
                                            </span>
                                            <span className="text-white/40">→</span>
                                            <span className="flex items-center gap-1 text-white/80 text-[10px] font-bold">
                                                <CalendarDays size={10} /> {fmt(goal.endDate)}
                                            </span>
                                            {goal.sessionsCount && (
                                                <span className="flex items-center gap-1 text-[10px] font-bold bg-white/20 text-white px-2 py-0.5 rounded-full">
                                                    <BookOpen size={9} /> {goal.sessionsCount} حصة
                                                </span>
                                            )}
                                            {dl && (
                                                <span className={cn("text-[10px] font-black px-2 py-0.5 rounded-full border mr-auto", dl.cls)}>
                                                    {dl.label}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                    {/* عدد الاختبارات */}
                                    <div className="flex items-center gap-2 pt-1 border-t border-white/20">
                                        <span className="text-white/60 text-[10px] font-bold">
                                            {goalExams.length} اختبار مسجّل
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* ── قائمة الاختبارات المنسدلة ── */}
                            {isOpen && (
                                <div className={cn("p-3", goal.isCompleted ? "bg-green-50/40" : cfg.listBg)}>
                                    {goalExams.length === 0 ? (
                                        <p className="text-center py-5 text-gray-400 text-xs font-bold">
                                            لا توجد اختبارات مسجّلة
                                        </p>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                            {goalExams.map((exam: any) => (
                                                <div key={exam.id} className="p-3 bg-white rounded-[16px] border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col gap-2">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-black text-gray-900 text-sm">{exam.surah}</span>
                                                            <span className={cn("text-[10px] font-black px-2 py-0.5 rounded-lg border", gradeColor(exam.grade))}>
                                                                {exam.grade}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            {editingExamId === exam.id ? (
                                                                <>
                                                                    <button onClick={() => handleSaveEdit(exam.id)} className="w-6 h-6 bg-green-500 text-white rounded-md flex items-center justify-center hover:bg-green-600">
                                                                        <Check size={11} />
                                                                    </button>
                                                                    <button onClick={handleCancelEdit} className="w-6 h-6 bg-gray-200 text-gray-500 rounded-md flex items-center justify-center hover:bg-gray-300">
                                                                        <X size={11} />
                                                                    </button>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    {canEdit && !goal.isCompleted && (
                                                                        <button onClick={() => handleStartEdit(exam)} className="w-6 h-6 text-blue-400 hover:text-blue-600 flex items-center justify-center rounded-md hover:bg-blue-50" title="تغيير النوع">
                                                                            <Pencil size={11} />
                                                                        </button>
                                                                    )}
                                                                    {user?.role === 'director' && (
                                                                        <button onClick={() => deleteExam.mutate(exam.id)} className="w-6 h-6 text-gray-300 hover:text-red-500 flex items-center justify-center rounded-md hover:bg-red-50" title="حذف">
                                                                            <Trash2 size={11} />
                                                                        </button>
                                                                    )}
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center justify-between border-t border-gray-50 pt-1.5">
                                                        {editingExamId === exam.id ? (
                                                            <select value={editType} onChange={e => setEditType(e.target.value)} autoFocus className="text-[10px] font-bold border border-blue-200 rounded-lg px-2 py-0.5 bg-blue-50 text-blue-700 focus:outline-none">
                                                                {EXAM_TYPES.map(t => <option key={t}>{t}</option>)}
                                                            </select>
                                                        ) : (
                                                            <span className="text-[10px] font-bold bg-gray-50 text-gray-400 px-2 py-0.5 rounded-lg border border-gray-100">{exam.type}</span>
                                                        )}
                                                        <span className="text-[10px] text-gray-400 font-bold">{exam.date}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}

                {/* ── قسم الاختبارات غير المصنفة (التي تظهر دائماً في حال وجودها) ── */}
                {unclassifiedExams.length > 0 && (
                    <div className="rounded-[22px] border border-gray-200 overflow-hidden shadow-sm transition-all bg-gray-50">
                        <div 
                            className="p-4 bg-gray-200 cursor-pointer flex items-center justify-between"
                            onClick={() => setShowUnclassified(!showUnclassified)}
                        >
                            <div className="flex items-center gap-2">
                                <div className="w-7 h-7 bg-white/50 rounded-lg flex items-center justify-center shrink-0">
                                    <BookOpen size={14} className="text-gray-600" />
                                </div>
                                <p className="text-gray-800 font-black text-sm">
                                    📂 اختبارات غير مصنفة 
                                    <span className="text-[10px] bg-white text-gray-600 px-2 py-0.5 rounded-full mr-2">
                                        {unclassifiedExams.length} اختبار
                                    </span>
                                </p>
                            </div>
                            <button className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/50 hover:bg-white text-gray-600 transition-colors">
                                {showUnclassified ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </button>
                        </div>
                        
                        {showUnclassified && (
                            <div className="p-3 bg-gray-50/60">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    {unclassifiedExams.map((exam: any) => (
                                        <div key={exam.id} className="p-3 bg-white rounded-[16px] border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col gap-2">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-black text-gray-900 text-sm">{exam.surah}</span>
                                                    <span className={cn("text-[10px] font-black px-2 py-0.5 rounded-lg border", gradeColor(exam.grade))}>
                                                        {exam.grade}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    {editingExamId === exam.id ? (
                                                        <>
                                                            <button onClick={() => handleSaveEdit(exam.id)} className="w-6 h-6 bg-green-500 text-white rounded-md flex items-center justify-center hover:bg-green-600">
                                                                <Check size={11} />
                                                            </button>
                                                            <button onClick={handleCancelEdit} className="w-6 h-6 bg-gray-200 text-gray-500 rounded-md flex items-center justify-center hover:bg-gray-300">
                                                                <X size={11} />
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            {canEdit && (
                                                                <button onClick={() => handleStartEdit(exam)} className="w-6 h-6 text-blue-400 hover:text-blue-600 flex items-center justify-center rounded-md hover:bg-blue-50" title="تغيير النوع">
                                                                    <Pencil size={11} />
                                                                </button>
                                                            )}
                                                            {user?.role === 'director' && (
                                                                <button onClick={() => deleteExam.mutate(exam.id)} className="w-6 h-6 text-gray-300 hover:text-red-500 flex items-center justify-center rounded-md hover:bg-red-50" title="حذف">
                                                                    <Trash2 size={11} />
                                                                </button>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between border-t border-gray-50 pt-1.5">
                                                {editingExamId === exam.id ? (
                                                    <select value={editType} onChange={e => setEditType(e.target.value)} autoFocus className="text-[10px] font-bold border border-blue-200 rounded-lg px-2 py-0.5 bg-blue-50 text-blue-700 focus:outline-none">
                                                        {EXAM_TYPES.map(t => <option key={t}>{t}</option>)}
                                                    </select>
                                                ) : (
                                                    <span className="text-[10px] font-bold bg-gray-50 text-gray-400 px-2 py-0.5 rounded-lg border border-gray-100">{exam.type}</span>
                                                )}
                                                <span className="text-[10px] text-gray-400 font-bold">{exam.date}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

            </div>


            {/* ═══════════════════════════════════════
                مودال تسجيل اختبار
            ════════════════════════════════════════ */}
            {examModal?.open && (
                <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm p-4" onClick={e => { if (e.target === e.currentTarget) setExamModal(null); }}>
                    <div className="w-full max-w-md bg-white rounded-[28px] shadow-2xl overflow-hidden" style={{ animation: 'slideUp 0.25s cubic-bezier(0.34,1.56,0.64,1)' }}>
                        <div className={cn("px-6 pt-6 pb-5", TYPE_CONFIG[examModal.type].headerBg)}>
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="font-black text-white text-base">تسجيل اختبار</h3>
                                    <p className="text-white/70 text-xs font-bold mt-0.5">النوع: {examModal.type}</p>
                                </div>
                                <button onClick={() => setExamModal(null)} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors">
                                    <X size={14} />
                                </button>
                            </div>
                        </div>
                        <div className="px-6 py-5 space-y-4">
                            <div>
                                <label className="text-xs font-bold text-gray-500 block mb-1.5">اسم السورة / الجزء</label>
                                <input
                                    type="text" value={surahName}
                                    onChange={e => setSurahName(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleAddExam()}
                                    placeholder="مثال: من 1 إلى 30 الحاقة"
                                    autoFocus
                                    className="w-full h-12 rounded-xl px-4 text-sm border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:bg-white transition-all"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 block mb-1.5">التقدير</label>
                                    <select value={examGrade} onChange={e => setExamGrade(e.target.value)} className="w-full h-12 rounded-xl text-sm font-bold border border-gray-200 bg-gray-50 px-3 focus:outline-none focus:ring-2 focus:ring-blue-300">
                                        <option>ممتاز</option><option>جيد جداً</option><option>جيد</option><option>يعاد</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 block mb-1.5">📅 التاريخ</label>
                                    <input type="date" value={examDate} onChange={e => setExamDate(e.target.value)} className="w-full h-12 rounded-xl px-3 text-sm border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-300 cursor-pointer" />
                                </div>
                            </div>
                            <div className="flex gap-3 pt-1">
                                <Button onClick={handleAddExam} disabled={addExam.isPending} className={cn("flex-1 h-12 text-sm font-bold rounded-xl", TYPE_CONFIG[examModal.type].activeBg)}>
                                    {addExam.isPending ? 'جاري الحفظ...' : '✓ حفظ الاختبار'}
                                </Button>
                                <button onClick={() => setExamModal(null)} className="px-5 h-12 rounded-xl text-sm font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 transition-colors">إلغاء</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}


            {/* ═══════════════════════════════════════
                مودال إنهاء الهدف
            ════════════════════════════════════════ */}
            {completeModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={e => { if (e.target === e.currentTarget) setCompleteModal(null); }}>
                    <div className="w-full max-w-sm bg-white rounded-[28px] shadow-2xl overflow-hidden" style={{ animation: 'slideUp 0.25s cubic-bezier(0.34,1.56,0.64,1)' }}>
                        <div className="bg-green-600 px-6 pt-6 pb-5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="font-black text-white text-base">إنهاء الهدف</h3>
                                    <p className="text-white/70 text-xs font-bold mt-0.5 max-w-[200px] truncate">{completeModal.title}</p>
                                </div>
                                <button onClick={() => setCompleteModal(null)} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30">
                                    <X size={14} />
                                </button>
                            </div>
                        </div>
                        <div className="px-6 py-5 space-y-4">
                            <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
                                <CheckCircle size={28} className="text-green-500 mx-auto mb-1" />
                                <p className="text-sm font-bold text-green-700">تأكيد إنهاء هذا الهدف</p>
                                <p className="text-xs text-green-500 mt-0.5">لن تتمكن من تعديل الاختبارات بعد الإنهاء</p>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 block mb-1.5">اسم المعلم/المعلمة الذي أنهى الهدف</label>
                                <input
                                    type="text"
                                    value={completedByName}
                                    onChange={e => setCompletedByName(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleCompleteGoal()}
                                    placeholder="أ. محمد أحمد"
                                    autoFocus
                                    className="w-full h-12 rounded-xl px-4 text-sm border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-300 focus:bg-white transition-all"
                                />
                            </div>
                            <div className="flex gap-3">
                                <Button
                                    onClick={handleCompleteGoal}
                                    disabled={updateGoal.isPending}
                                    className="flex-1 h-12 text-sm font-bold rounded-xl bg-green-600 hover:bg-green-700"
                                >
                                    {updateGoal.isPending ? 'جاري الحفظ...' : '✓ تأكيد الإنهاء'}
                                </Button>
                                <button onClick={() => setCompleteModal(null)} className="px-5 h-12 rounded-xl text-sm font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 transition-colors">إلغاء</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}


            {/* ═══════════════════════════════════════
                مودال إضافة / تعديل هدف
            ════════════════════════════════════════ */}
            {goalModal?.open && (
                <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm p-4" onClick={e => { if (e.target === e.currentTarget) setGoalModal(null); }}>
                    <div className="w-full max-w-md bg-white rounded-[28px] shadow-2xl overflow-hidden" style={{ animation: 'slideUp 0.25s cubic-bezier(0.34,1.56,0.64,1)' }}>
                        <div className={cn("px-6 pt-6 pb-5", TYPE_CONFIG[goalModal.type].headerBg)}>
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="font-black text-white text-base">
                                        {goalModal.editing ? 'تعديل الهدف' : 'إضافة هدف جديد'}
                                    </h3>
                                    <p className="text-white/70 text-xs font-bold mt-0.5">النوع: {goalModal.type}</p>
                                </div>
                                <button onClick={() => setGoalModal(null)} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30">
                                    <X size={14} />
                                </button>
                            </div>
                        </div>
                        <div className="px-6 py-5 space-y-4">
                            <div>
                                <label className="text-xs font-bold text-gray-500 block mb-1.5">عنوان الهدف</label>
                                <input type="text" value={goalTitle} onChange={e => setGoalTitle(e.target.value)} placeholder="مثال: إنهاء مراجعة جزء عم" autoFocus className="w-full h-12 rounded-xl px-4 text-sm border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-300" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 block mb-1.5">📅 تاريخ البداية</label>
                                    <input type="date" value={goalStart} onChange={e => handleGoalStartChange(e.target.value)} className="w-full h-12 rounded-xl px-3 text-sm border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-300 cursor-pointer" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 block mb-1.5">
                                        <BookOpen size={10} className="inline ml-1" />عدد الحصص
                                        <span className="text-[9px] text-gray-400 mr-1">(يحسب النهاية)</span>
                                    </label>
                                    <input type="number" min="1" value={goalSessions} onChange={e => handleSessionsChange(e.target.value)} placeholder="20" className="w-full h-12 rounded-xl px-3 text-sm border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-300 text-center font-bold" />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 block mb-1.5">🏁 تاريخ النهاية المتوقع <span className="text-[9px] text-gray-400">(الخميس والجمعة إجازة)</span></label>
                                <input type="date" value={goalEnd} onChange={e => setGoalEnd(e.target.value)} min={goalStart} className="w-full h-12 rounded-xl px-3 text-sm border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-300 cursor-pointer" />
                                {goalEnd && <p className="text-[10px] text-gray-400 mt-1 text-center font-bold">{fmt(goalEnd)}</p>}
                            </div>
                            <div className="flex gap-3 pt-1">
                                <Button onClick={handleSaveGoal} disabled={addGoal.isPending || updateGoal.isPending} className={cn("flex-1 h-12 text-sm font-bold rounded-xl", TYPE_CONFIG[goalModal.type].activeBg)}>
                                    {addGoal.isPending || updateGoal.isPending ? 'جاري الحفظ...' : '✓ حفظ الهدف'}
                                </Button>
                                <button onClick={() => setGoalModal(null)} className="px-5 h-12 rounded-xl text-sm font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 transition-colors">إلغاء</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes slideUp {
                    from { transform: translateY(60px); opacity: 0; }
                    to   { transform: translateY(0); opacity: 1; }
                }
            `}</style>
        </div>
    );
}