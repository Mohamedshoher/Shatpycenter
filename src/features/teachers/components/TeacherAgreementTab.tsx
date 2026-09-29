"use client";

import { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import FileText from 'lucide-react/dist/esm/icons/file-text';
import AlertCircle from 'lucide-react/dist/esm/icons/alert-circle';
import Pencil from 'lucide-react/dist/esm/icons/pencil';
import X from 'lucide-react/dist/esm/icons/x';
import { Teacher } from '@/types';
import { useAuthStore } from '@/store/useAuthStore';
import { getAgreementTerms, updateAgreementTerm, AgreementTerm } from '../services/agreementTermsService';
import { Button } from '@/components/ui/button';

interface Props {
    teacher: Teacher | null | undefined;
}

// استبدال المتغيرات الديناميكية (ساعات/أيام العمل) داخل نص البند بقيم المعلم الفعلية
const applyTokens = (content: string, teacher: Teacher | null | undefined) => {
    return content
        .replace(/\{dailyHours\}/g, String(Number(teacher?.dailyHours) || 4))
        .replace(/\{weeklyWorkingDays\}/g, String(Number(teacher?.weeklyWorkingDays) || 5));
};

// عرض محتوى البند سطرًا بسطر: "- " قائمة نقطية، "! " تحذير بالأحمر، "* " ملحوظة كهرمانية، غير ذلك فقرة عادية
const TermContent = ({ content }: { content: string }) => {
    const blocks = content.split('\n\n');
    return (
        <div className="space-y-3">
            {blocks.map((block, i) => {
                const lines = block.split('\n').filter(Boolean);
                if (lines.every(l => l.startsWith('- '))) {
                    return (
                        <ul key={i} className="space-y-2 pr-4">
                            {lines.map((l, j) => (
                                <li key={j} className="text-sm text-gray-700 flex items-start gap-2">
                                    <span>📌</span>
                                    <span>{l.slice(2)}</span>
                                </li>
                            ))}
                        </ul>
                    );
                }
                return (
                    <div key={i} className="space-y-2">
                        {lines.map((l, j) => {
                            if (l.startsWith('! ')) {
                                return <p key={j} className="text-sm font-bold text-red-600">❌ {l.slice(2)}</p>;
                            }
                            if (l.startsWith('* ')) {
                                return (
                                    <div key={j} className="mt-1 flex items-center gap-2 text-amber-600 bg-amber-50 rounded-xl p-3 text-xs font-bold">
                                        <AlertCircle size={14} />
                                        <span>{l.slice(2)}</span>
                                    </div>
                                );
                            }
                            if (l.startsWith('- ')) {
                                return (
                                    <p key={j} className="text-sm text-gray-700 flex items-start gap-2 pr-4">
                                        <span>📌</span><span>{l.slice(2)}</span>
                                    </p>
                                );
                            }
                            return <p key={j} className="text-sm text-gray-700 leading-relaxed">{l}</p>;
                        })}
                    </div>
                );
            })}
        </div>
    );
};

const SECTIONS = ['قرآن', 'تلقين', 'نور بيان', 'تجويد'] as const;

const scopeBadge = (term: AgreementTerm) => {
    if (term.scope === 'teacher') return 'نسخة خاصة بهذا المعلم';
    if (term.scope === 'section') return `نسخة خاصة بقسم ${term.scopeValue}`;
    return null;
};

export const TeacherAgreementTab = ({ teacher }: Props) => {
    const { user } = useAuthStore();
    const isDirector = user?.role === 'director';
    const queryClient = useQueryClient();

    const { data: terms = [], isLoading } = useQuery({
        queryKey: ['agreement-terms', teacher?.id],
        queryFn: () => getAgreementTerms(teacher?.id),
        enabled: !!teacher?.id,
    });

    const [editingTerm, setEditingTerm] = useState<AgreementTerm | null>(null);
    const [editTitle, setEditTitle] = useState('');
    const [editContent, setEditContent] = useState('');
    const [step, setStep] = useState<'edit' | 'scope'>('edit');
    const [chosenScope, setChosenScope] = useState<'all' | 'section' | 'teacher'>('all');
    const [chosenSection, setChosenSection] = useState<typeof SECTIONS[number]>('قرآن');

    const openEdit = (term: AgreementTerm) => {
        setEditingTerm(term);
        setEditTitle(term.title);
        setEditContent(term.content);
        setStep('edit');
        setChosenScope('all');
    };

    const closeModal = () => { setEditingTerm(null); setStep('edit'); };

    const saveMutation = useMutation({
        mutationFn: () => {
            if (!editingTerm) return Promise.reject('no term');
            return updateAgreementTerm(editingTerm.id, editTitle, editContent, chosenScope, {
                scopeValue: chosenScope === 'section' ? chosenSection : undefined,
                teacherId: chosenScope === 'teacher' ? teacher?.id : undefined,
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['agreement-terms'] });
            closeModal();
        },
    });

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div className="bg-gradient-to-br from-emerald-50 to-white p-6 md:p-8 rounded-[32px] border border-emerald-100 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600">
                        <FileText size={24} />
                    </div>
                    <div className="text-right">
                        <h3 className="text-xl font-black text-emerald-900">بنود اتفاق العمل</h3>
                        <p className="text-sm font-bold text-emerald-600">مركز الشاطبي للقرآن الكريم وعلومه</p>
                    </div>
                </div>

                <p className="text-sm text-gray-600 text-right mb-8 leading-relaxed">
                    حرصًا على جودة العمل، وانتظام سير الدراسة، وتحقيق أفضل خدمة لطلاب المركز وأولياء الأمور،
                    فقد تم الاتفاق على البنود الآتية، ويُعد الالتزام بها جزءًا أساسيًا من نظام العمل بالمركز.
                </p>

                {isLoading ? (
                    <div className="text-center py-10 text-gray-400 text-sm font-bold">جاري تحميل البنود...</div>
                ) : (
                    <div className="space-y-6">
                        {terms.map((term) => (
                            <div key={term.id} className="bg-white rounded-2xl p-5 border border-emerald-50 shadow-sm">
                                <div className="flex items-center justify-between mb-1">
                                    <h4 className="font-black text-emerald-800 text-base flex items-center gap-2">
                                        <span>{term.icon}</span> {term.title}
                                    </h4>
                                    {isDirector && (
                                        <button
                                            onClick={() => openEdit(term)}
                                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors shrink-0"
                                            title="تعديل البند"
                                        >
                                            <Pencil size={13} />
                                        </button>
                                    )}
                                </div>
                                {scopeBadge(term) && (
                                    <span className="inline-block text-[10px] font-bold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full mb-2">
                                        {scopeBadge(term)}
                                    </span>
                                )}
                                <TermContent content={applyTokens(term.content, teacher)} />
                            </div>
                        ))}
                    </div>
                )}

                <div className="mt-8 text-center">
                    <p className="text-sm font-bold text-emerald-800">
                        نسأل الله التوفيق والسداد للجميع، وأن يجعل هذا العمل خالصًا لوجهه الكريم.
                    </p>
                </div>
            </div>

            {/* مودال تعديل البند (للمدير فقط) */}
            {editingTerm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={e => { if (e.target === e.currentTarget) closeModal(); }}>
                    <div className="w-full max-w-lg bg-white rounded-[28px] shadow-2xl overflow-hidden">
                        <div className="px-6 pt-6 pb-5 bg-emerald-600">
                            <div className="flex items-center justify-between">
                                <h3 className="font-black text-white text-base">{step === 'edit' ? 'تعديل البند' : 'تطبيق التعديل على...'}</h3>
                                <button onClick={closeModal} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors">
                                    <X size={14} />
                                </button>
                            </div>
                        </div>

                        {step === 'edit' ? (
                            <div className="px-6 py-5 space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 block mb-1.5">عنوان البند</label>
                                    <input
                                        type="text" value={editTitle}
                                        onChange={e => setEditTitle(e.target.value)}
                                        className="w-full h-12 rounded-xl px-4 text-sm border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 block mb-1.5">
                                        نص البند
                                        <span className="text-gray-400 font-normal mr-2">
                                            (&quot;- &quot; قائمة، &quot;! &quot; تحذير أحمر، &quot;* &quot; ملحوظة، سطر فارغ = فقرة جديدة)
                                        </span>
                                    </label>
                                    <textarea
                                        value={editContent}
                                        onChange={e => setEditContent(e.target.value)}
                                        rows={10}
                                        className="w-full rounded-xl px-4 py-3 text-sm border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-300 leading-relaxed"
                                        dir="rtl"
                                    />
                                </div>
                                <div className="flex gap-3 pt-1">
                                    <Button
                                        onClick={() => {
                                            if (!editTitle.trim() || !editContent.trim()) return;
                                            setStep('scope');
                                        }}
                                        className="flex-1 h-12 text-sm font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700"
                                    >
                                        التالي
                                    </Button>
                                    <button onClick={closeModal} className="px-5 h-12 rounded-xl text-sm font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 transition-colors">إلغاء</button>
                                </div>
                            </div>
                        ) : (
                            <div className="px-6 py-5 space-y-4">
                                <p className="text-sm text-gray-600 leading-relaxed">
                                    هل تريد تعميم هذا التعديل على الجميع، أم يكون خاصًا بقسم معين، أم بهذا المعلم فقط
                                    ({teacher?.fullName})؟
                                </p>

                                <div className="space-y-2">
                                    <button
                                        onClick={() => setChosenScope('all')}
                                        className={`w-full text-right px-4 py-3 rounded-xl text-sm font-bold border transition-all ${chosenScope === 'all' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'}`}
                                    >
                                        🌍 تعميم على جميع المجموعات
                                    </button>

                                    <button
                                        onClick={() => setChosenScope('section')}
                                        className={`w-full text-right px-4 py-3 rounded-xl text-sm font-bold border transition-all ${chosenScope === 'section' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'}`}
                                    >
                                        🗂️ تعميم على قسم معين فقط
                                    </button>
                                    {chosenScope === 'section' && (
                                        <div className="grid grid-cols-2 gap-2 pr-4">
                                            {SECTIONS.map((s) => (
                                                <button
                                                    key={s}
                                                    onClick={() => setChosenSection(s)}
                                                    className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all ${chosenSection === s ? 'bg-emerald-100 text-emerald-700 border-emerald-300' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}
                                                >
                                                    {s}
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    <button
                                        onClick={() => setChosenScope('teacher')}
                                        className={`w-full text-right px-4 py-3 rounded-xl text-sm font-bold border transition-all ${chosenScope === 'teacher' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'}`}
                                    >
                                        👤 لا، خاص بهذا المعلم فقط ({teacher?.fullName})
                                    </button>
                                </div>

                                <div className="flex gap-3 pt-1">
                                    <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="flex-1 h-12 text-sm font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700">
                                        {saveMutation.isPending ? 'جاري الحفظ...' : '✓ حفظ وإرسال الإشعار'}
                                    </Button>
                                    <button onClick={() => setStep('edit')} className="px-5 h-12 rounded-xl text-sm font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 transition-colors">رجوع</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
