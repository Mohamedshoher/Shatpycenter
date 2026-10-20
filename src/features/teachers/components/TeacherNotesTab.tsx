"use client";// ملحوظات المدرّس: عامة (يراها المدير والمدرس) وخاصة (المدير فقط)

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import StickyNote from 'lucide-react/dist/esm/icons/sticky-note';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import User from 'lucide-react/dist/esm/icons/user';
import Eye from 'lucide-react/dist/esm/icons/eye';
import Lock from 'lucide-react/dist/esm/icons/lock';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/useAuthStore';
import { Teacher } from '@/types';
import { getTeacherNotes, addTeacherNote, deleteTeacherNote, TeacherNoteVisibility } from '../services/notesService';

interface TeacherNotesTabProps {
    teacher: Teacher | null | undefined;
    isDirector: boolean;
}

export const TeacherNotesTab = ({ teacher, isDirector }: TeacherNotesTabProps) => {
    const { user } = useAuthStore();
    const queryClient = useQueryClient();
    const [noteText, setNoteText] = useState('');
    const [visibility, setVisibility] = useState<TeacherNoteVisibility>('general');
    const teacherId = teacher?.id || '';

    const { data: notes = [], isLoading } = useQuery({
        queryKey: ['teacher-notes', teacherId],
        queryFn: () => getTeacherNotes(teacherId),
        enabled: !!teacherId,
    });

    const addMutation = useMutation({
        mutationFn: () => addTeacherNote(teacherId, noteText.trim(), visibility),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['teacher-notes', teacherId] });
            setNoteText('');
            setVisibility('general');
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => deleteTeacherNote(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['teacher-notes', teacherId] }),
    });

    if (!teacher) return null;

    const handleAdd = () => {
        if (!noteText.trim()) return alert('اكتب الملحوظة');
        addMutation.mutate();
    };

    return (
        <div className="space-y-4">
            {/* نموذج إضافة ملحوظة جديدة - للمدير فقط */}
            {isDirector && (
                <div className="bg-gray-50 p-5 rounded-[24px] border border-gray-100 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                        <h4 className="font-bold text-sm text-gray-800 flex items-center gap-2">
                            <StickyNote size={16} className="text-blue-600" />
                            <span>إضافة ملحوظة جديدة</span>
                        </h4>
                        {user?.displayName && (
                            <span className="text-[11px] font-bold text-gray-400 bg-white px-2.5 py-0.5 rounded-lg border border-gray-100">
                                تسجيل باسم: {user.displayName}
                            </span>
                        )}
                    </div>

                    <textarea
                        value={noteText}
                        onChange={e => setNoteText(e.target.value)}
                        className="w-full h-24 rounded-2xl p-4 text-sm bg-white text-gray-900 border border-gray-200/70 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all shadow-inner"
                        placeholder="اكتب الملحوظة هنا بخصوص المدرّس..."
                    />

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setVisibility('general')}
                            className={cn(
                                "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-black border transition-all cursor-pointer",
                                visibility === 'general'
                                    ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                                    : "bg-white text-gray-500 border-gray-200 hover:border-blue-200"
                            )}
                        >
                            <Eye size={14} />
                            <span>عامة (يراها المدرّس)</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setVisibility('private')}
                            className={cn(
                                "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-black border transition-all cursor-pointer",
                                visibility === 'private'
                                    ? "bg-amber-600 text-white border-amber-600 shadow-sm"
                                    : "bg-white text-gray-500 border-gray-200 hover:border-amber-200"
                            )}
                        >
                            <Lock size={14} />
                            <span>خاصة (المدير فقط)</span>
                        </button>
                    </div>

                    <Button
                        onClick={handleAdd}
                        disabled={addMutation.isPending}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl py-2.5 shadow-md shadow-blue-500/10 cursor-pointer disabled:opacity-50"
                    >
                        {addMutation.isPending ? 'جاري الحفظ...' : 'تسجيل الملحوظة'}
                    </Button>
                </div>
            )}

            {/* قائمة الملحوظات */}
            <div className="space-y-3">
                {isLoading ? (
                    <div className="py-8 text-center text-gray-400 text-xs font-bold">جاري التحميل...</div>
                ) : notes.length > 0 ? (
                    notes.map((note) => (
                        <div key={note.id} className="p-4 md:p-5 rounded-2xl border bg-white border-gray-100 shadow-sm relative text-right space-y-3 hover:border-blue-100 transition-all">
                            <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-gray-50">
                                <div className="flex items-center gap-2">
                                    <div className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-800 px-2.5 py-1 rounded-xl text-xs font-black border border-blue-100/70">
                                        <User size={13} className="text-blue-600 shrink-0" />
                                        <span>{note.createdBy || 'المدير'}</span>
                                    </div>
                                    <span className={cn(
                                        "inline-flex items-center gap-1 px-2 py-1 rounded-xl text-[10px] font-black border",
                                        note.visibility === 'private'
                                            ? "bg-amber-50 text-amber-700 border-amber-100"
                                            : "bg-emerald-50 text-emerald-700 border-emerald-100"
                                    )}>
                                        {note.visibility === 'private' ? <Lock size={11} /> : <Eye size={11} />}
                                        <span>{note.visibility === 'private' ? 'خاصة' : 'عامة'}</span>
                                    </span>
                                </div>
                                <span className="text-[11px] text-gray-400 font-bold">
                                    {new Date(note.createdAt).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' })}
                                </span>
                            </div>

                            <p className="text-sm font-bold text-gray-800 leading-relaxed break-words pr-1">
                                {note.content}
                            </p>

                            {isDirector && (
                                <div className="flex justify-end pt-1">
                                    <button
                                        onClick={() => {
                                            if (confirm('هل أنت متأكد من حذف هذه الملحوظة؟')) {
                                                deleteMutation.mutate(note.id);
                                            }
                                        }}
                                        className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                                        title="حذف الملحوظة"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            )}
                        </div>
                    ))
                ) : (
                    <div className="py-8 text-center space-y-2 bg-gray-50/60 rounded-2xl border border-dashed border-gray-200">
                        <StickyNote size={28} className="text-gray-300 mx-auto" />
                        <p className="text-gray-400 text-xs font-bold">لا توجد ملحوظات مسجلة لهذا المدرّس</p>
                    </div>
                )}
            </div>
        </div>
    );
};
