"use client";

import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/useAuthStore';
import { getNotesPage, replyToNote, deleteStudentNote, markNoteAsRead } from '@/features/students/services/recordsService';
import { getStudentById } from '@/features/students/services/studentService';
import EditStudentModal from '@/features/students/components/EditStudentModal';
import { useStudents } from '@/features/students/hooks/useStudents';
import { cn, getWhatsAppUrl } from '@/lib/utils';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Student } from '@/types';
import MessageSquare from 'lucide-react/dist/esm/icons/message-square'
import Loader from 'lucide-react/dist/esm/icons/loader'
import Users from 'lucide-react/dist/esm/icons/users'
import User from 'lucide-react/dist/esm/icons/user'
import Trash2 from 'lucide-react/dist/esm/icons/trash-2'
import Archive from 'lucide-react/dist/esm/icons/archive'
import Pencil from 'lucide-react/dist/esm/icons/pencil'
import CheckCircle2 from 'lucide-react/dist/esm/icons/check-circle-2'
import Circle from 'lucide-react/dist/esm/icons/circle'
import MessageCircle from 'lucide-react/dist/esm/icons/message-circle'
import Reply from 'lucide-react/dist/esm/icons/reply'
import Send from 'lucide-react/dist/esm/icons/send'
import Search from 'lucide-react/dist/esm/icons/search'
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down'

interface NoteItem {
    id: string;
    content: string;
    createdAt: string;
    createdBy: string;
    studentId: string;
    studentName: string;
    parentPhone: string;
    groupName: string;
    groupId: string | null;
    teacherId: string | null;
    teacherName: string;
    isRead: boolean;
    reply?: string;
    repliedBy?: string;
    repliedAt?: string;
}

type StatusFilter = 'all' | 'unread' | 'read';
type ReplyFilter = 'all' | 'replied' | 'unreplied';

const formatNoteDate = (iso?: string) => {
    if (!iso) return '---';
    try {
        return format(new Date(iso), 'dd MMMM yyyy - hh:mm a', { locale: ar });
    } catch {
        return '---';
    }
};

export default function StudentNotesPage() {
    const { user } = useAuthStore();
    const queryClient = useQueryClient();
    const { archiveStudent } = useStudents();
    const teacherId = user?.role === 'teacher' ? user.teacherId : undefined;

    const [teacherMenuOpen, setTeacherMenuOpen] = useState(false);
    const [selectedTeacher, setSelectedTeacher] = useState<string>('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [replyFilter, setReplyFilter] = useState<ReplyFilter>('all');
    const [replyingTo, setReplyingTo] = useState<string | null>(null);
    const [replyText, setReplyText] = useState('');
    const [hiddenIds, setHiddenIds] = useState<string[]>([]);
    const [readOverrides, setReadOverrides] = useState<Record<string, boolean>>({});
    const [editStudent, setEditStudent] = useState<Student | null>(null);
    const [editingNoteId, setEditingNoteId] = useState<string | null>(null);

    const { data: allNotes = [], isLoading } = useQuery({
        queryKey: ['student-notes-page', teacherId ?? 'all'],
        queryFn: () => getNotesPage({ teacherId }),
        staleTime: 1000 * 30,
    });

    const visibleNotes = useMemo(
        () => (allNotes as NoteItem[])
            .filter(n => !hiddenIds.includes(n.id))
            .map(n => ({ ...n, isRead: n.id in readOverrides ? readOverrides[n.id] : n.isRead })),
        [allNotes, hiddenIds, readOverrides]
    );

    const teachers = useMemo(() => {
        const map = new Map<string, string>();
        visibleNotes.forEach(n => {
            if (n.teacherId) map.set(n.teacherId, n.teacherName || 'غير معروف');
        });
        return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
    }, [visibleNotes]);

    const filteredNotes = useMemo(() => {
        return visibleNotes.filter(n => {
            if (selectedTeacher && n.teacherId !== selectedTeacher) return false;
            if (statusFilter === 'unread' && n.isRead) return false;
            if (statusFilter === 'read' && !n.isRead) return false;
            if (replyFilter === 'replied' && !n.reply) return false;
            if (replyFilter === 'unreplied' && n.reply) return false;
            return true;
        });
    }, [visibleNotes, selectedTeacher, statusFilter, replyFilter]);

    const stats = useMemo(() => ({
        unread: visibleNotes.filter(n => !n.isRead).length,
        replied: visibleNotes.filter(n => n.reply).length,
    }), [visibleNotes]);

    const resetFilters = () => {
        setSelectedTeacher('');
        setStatusFilter('all');
        setReplyFilter('all');
    };

    const refresh = () => {
        queryClient.invalidateQueries({ queryKey: ['student-notes-page'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    };

    const handleToggleRead = async (note: NoteItem) => {
        const next = !note.isRead;
        setReadOverrides(prev => ({ ...prev, [note.id]: next }));
        try {
            await markNoteAsRead(note.id, next);
            refresh();
        } catch (error) {
            setReadOverrides(prev => {
                const copy = { ...prev };
                delete copy[note.id];
                return copy;
            });
            console.error('Error toggling note read:', error);
        }
    };

    const handleDelete = async (note: NoteItem) => {
        if (!confirm('هل أنت متأكد من حذف هذه الملحوظة؟')) return;
        setHiddenIds(prev => [...prev, note.id]);
        try {
            await deleteStudentNote(note.id);
            refresh();
        } catch (error) {
            setHiddenIds(prev => prev.filter(id => id !== note.id));
            console.error('Error deleting note:', error);
        }
    };

    const handleArchive = async (note: NoteItem) => {
        if (!confirm(`هل أنت متأكد من أرشفة الطالب/ة ${note.studentName}؟`)) return;
        setHiddenIds(prev => [...prev, note.id]);
        setReadOverrides(prev => ({ ...prev, [note.id]: true }));
        try {
            await archiveStudent(note.studentId);
            await markNoteAsRead(note.id, true);
            refresh();
        } catch (error) {
            setHiddenIds(prev => prev.filter(id => id !== note.id));
            console.error('Error archiving student:', error);
            alert('تعذرت الأرشفة، حاول مرة أخرى');
        }
    };

    const handleEdit = async (note: NoteItem) => {
        setEditingNoteId(note.id);
        const student = await getStudentById(note.studentId);
        setEditingNoteId(null);
        if (student) setEditStudent(student);
        else alert('تعذر تحميل بيانات الطالب');
    };

    const handleSendReply = async (noteId: string) => {
        if (!replyText.trim()) return;
        const text = replyText.trim();
        setReplyText('');
        setReplyingTo(null);
        try {
            await replyToNote(noteId, text, user?.displayName || 'المدير');
            refresh();
        } catch (error) {
            console.error('Error replying to note:', error);
            alert('تعذر إرسال الرد، حاول مرة أخرى');
        }
    };

    const noteCard = (note: NoteItem) => (
        <div
            key={note.id}
            className={cn(
                "bg-white border rounded-[32px] p-5 md:p-6 shadow-sm hover:shadow-xl hover:shadow-blue-500/5 transition-all group relative overflow-hidden",
                note.isRead ? "border-gray-100" : "border-blue-200/60 bg-blue-50/20"
            )}
        >
            {!note.isRead && (
                <span className="absolute top-0 right-0 w-16 h-16 bg-blue-600 rounded-bl-full" />
            )}
            <div className="flex flex-col gap-4">
                {/* Line 1: Student Name + Date */}
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                            <User size={16} />
                        </div>
                        <div className="text-right">
                            <p className="font-black text-gray-900 text-sm md:text-base leading-tight">{note.studentName}</p>
                            <p className="text-[10px] text-gray-400 font-bold">{formatNoteDate(note.createdAt)}</p>
                        </div>
                    </div>
                </div>

                {/* Line 2: Action Icons */}
                <div className="flex items-center justify-end gap-1 bg-white/70 p-1 rounded-2xl border border-gray-50">
                    {note.parentPhone && (
                        <button
                            onClick={() => {
                                const text = `السلام عليكم ورحمة الله وبركاته\n\nنود إحاطتكم علماً بملحوظة بخصوص الطالب/ة *${note.studentName}*:\n\n"${note.content}"\n\nمع تحيات إدارة مركز الشاطبي 🌹`;
                                window.open(getWhatsAppUrl(note.parentPhone || '', text), '_blank');
                            }}
                            className="w-9 h-9 flex items-center justify-center text-green-600 hover:text-green-700 hover:bg-white rounded-xl transition-all"
                            title="إرسال عبر واتساب"
                        >
                            <MessageCircle size={18} />
                        </button>
                    )}
                    {user?.role === 'director' && (
                        <button
                            onClick={() => handleDelete(note)}
                            className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-white rounded-xl transition-all"
                            title="حذف الملحوظة"
                        >
                            <Trash2 size={18} />
                        </button>
                    )}
                    <button
                        onClick={() => handleEdit(note)}
                        disabled={editingNoteId === note.id || user?.role === 'schedule_secretary'}
                        className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-white rounded-xl transition-all disabled:opacity-50 disabled:pointer-events-none"
                        title="تعديل بيانات الطالب"
                    >
                        {editingNoteId === note.id ? (
                            <Loader size={16} className="animate-spin" />
                        ) : (
                            <Pencil size={18} />
                        )}
                    </button>
                    {user?.role !== 'schedule_secretary' && (
                        <button
                            onClick={() => handleArchive(note)}
                            className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-amber-600 hover:bg-white rounded-xl transition-all"
                            title="أرشفة الطالب"
                        >
                            <Archive size={18} />
                        </button>
                    )}
                    <button
                        onClick={() => handleToggleRead(note)}
                        className={cn(
                            "w-9 h-9 flex items-center justify-center rounded-xl transition-all",
                            note.isRead
                                ? "text-green-500 bg-white border border-green-50"
                                : "text-gray-400 hover:text-blue-600 hover:bg-white"
                        )}
                        title={note.isRead ? 'تعليم كغير مقروء' : 'تعليم كمقروء'}
                    >
                        {note.isRead ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                    </button>
                </div>

                {/* Line 3: Note Content */}
                <div className="bg-blue-50/30 rounded-[24px] p-5 text-right border border-blue-100/30 relative group-hover:bg-blue-50/50 transition-colors">
                    <div className="absolute top-4 right-4 text-blue-200/50 -rotate-12">
                        <MessageSquare size={40} />
                    </div>
                    <p className="text-sm font-bold text-gray-700 leading-relaxed relative z-10 pr-2">
                        {note.content}
                    </p>
                </div>

                {/* Reply Section */}
                {note.reply && (
                    <div className="bg-green-50/50 rounded-[20px] p-4 text-right border border-green-200/40 mr-6">
                        <div className="flex items-center gap-2 mb-2">
                            <Reply size={14} className="text-green-500" />
                            <span className="text-[10px] font-black text-green-700">رد على الملحوظة</span>
                            {note.repliedBy && (
                                <span className="text-[10px] text-gray-400 font-bold">- {note.repliedBy}</span>
                            )}
                            {note.repliedAt && (
                                <span className="text-[10px] text-gray-300 font-bold">{formatNoteDate(note.repliedAt)}</span>
                            )}
                        </div>
                        <p className="text-sm font-bold text-gray-700 leading-relaxed">
                            {note.reply}
                        </p>
                    </div>
                )}

                {/* Bottom Row: Group & Teacher badges + Reply button */}
                <div className="flex flex-wrap flex-row-reverse items-center justify-between gap-3 pt-2">
                    <div className="flex flex-row-reverse gap-2">
                        <div className="flex items-center gap-1.5 bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-xl text-[10px] font-black border border-indigo-100/50">
                            <Users size={12} />
                            {note.groupName}
                        </div>
                        <div className="flex items-center gap-1.5 bg-purple-50 text-purple-700 px-3 py-1.5 rounded-xl text-[10px] font-black border border-purple-100/50">
                            <User size={12} />
                            {note.teacherName}
                        </div>
                    </div>

                    <button
                        onClick={() => setReplyingTo(replyingTo === note.id ? null : note.id)}
                        className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black transition-all border",
                            replyingTo === note.id
                                ? "bg-blue-600 text-white border-blue-600"
                                : "bg-gray-50 text-gray-500 border-gray-100 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200"
                        )}
                    >
                        <Reply size={12} />
                        {replyingTo === note.id ? 'إلغاء' : 'رد'}
                    </button>
                </div>

                {/* Reply Input */}
                {replyingTo === note.id && (
                    <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                        <input
                            type="text"
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder="اكتب ردك..."
                            className="flex-1 bg-gray-50 rounded-xl px-4 py-2.5 text-sm font-bold text-gray-700 border-none outline-none focus:ring-2 focus:ring-blue-200"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSendReply(note.id);
                            }}
                            autoFocus
                        />
                        <button
                            onClick={() => handleSendReply(note.id)}
                            className="w-9 h-9 flex items-center justify-center bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all"
                            title="إرسال الرد"
                        >
                            <Send size={16} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50/50 p-4 md:p-6 lg:p-8">
            <div className="max-w-5xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0">
                            <MessageSquare size={22} />
                        </div>
                        <div className="text-right">
                            <h1 className="text-2xl md:text-3xl font-black text-gray-900">ملحوظات الطلاب</h1>
                            <p className="text-xs md:text-sm text-gray-500 font-bold">تجميع جميع الملحوظات والردود عليها مع فلاتر لكل مدرس</p>
                        </div>
                    </div>
                </div>

                {/* Quick Filters */}
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        onClick={() => setStatusFilter(statusFilter === 'unread' ? 'all' : 'unread')}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black border transition-all",
                            statusFilter === 'unread'
                                ? "bg-red-600 text-white border-red-600 shadow-lg shadow-red-500/20"
                                : "bg-white border-gray-200 text-gray-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                        )}
                    >
                        <Circle size={14} />
                        غير مقروء
                        {stats.unread > 0 && (
                            <span className={cn(
                                "inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-[10px]",
                                statusFilter === 'unread' ? "bg-white text-red-600" : "bg-red-100 text-red-600"
                            )}>
                                {stats.unread}
                            </span>
                        )}
                    </button>

                    <div className="relative">
                        <button
                            onClick={() => setTeacherMenuOpen(v => !v)}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black border transition-all",
                                selectedTeacher
                                    ? "bg-purple-600 text-white border-purple-600 shadow-lg shadow-purple-500/20"
                                    : "bg-white border-gray-200 text-gray-600 hover:bg-purple-50 hover:text-purple-700 hover:border-purple-200"
                            )}
                        >
                            <Users size={14} />
                            {selectedTeacher
                                ? teachers.find(t => t.id === selectedTeacher)?.name || 'المدرسين'
                                : 'المدرسين'}
                            <ChevronDown size={14} className={cn("transition-transform", teacherMenuOpen && "rotate-180")} />
                        </button>
                        {teacherMenuOpen && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setTeacherMenuOpen(false)} />
                                <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-2xl border border-gray-200 shadow-xl z-50 p-2 space-y-1 max-h-64 overflow-y-auto">
                                    <button
                                        onClick={() => { setSelectedTeacher(''); setTeacherMenuOpen(false); }}
                                        className={cn(
                                            "w-full text-right px-3 py-2 rounded-xl text-xs font-bold transition-colors",
                                            !selectedTeacher ? "bg-purple-600 text-white" : "hover:bg-purple-50 text-gray-700"
                                        )}
                                    >
                                        جميع المدرسين
                                    </button>
                                    {teachers.map(t => (
                                        <button
                                            key={t.id}
                                            onClick={() => { setSelectedTeacher(t.id); setTeacherMenuOpen(false); }}
                                            className={cn(
                                                "w-full text-right px-3 py-2 rounded-xl text-xs font-bold transition-colors",
                                                selectedTeacher === t.id ? "bg-purple-600 text-white" : "hover:bg-purple-50 text-gray-700"
                                            )}
                                        >
                                            {t.name}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>

                    <button
                        onClick={() => setReplyFilter(replyFilter === 'replied' ? 'all' : 'replied')}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black border transition-all",
                            replyFilter === 'replied'
                                ? "bg-green-600 text-white border-green-600 shadow-lg shadow-green-500/20"
                                : "bg-white border-gray-200 text-gray-600 hover:bg-green-50 hover:text-green-700 hover:border-green-200"
                        )}
                    >
                        <Reply size={14} />
                        لها رد
                        {stats.replied > 0 && (
                            <span className={cn(
                                "inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-[10px]",
                                replyFilter === 'replied' ? "bg-white text-green-600" : "bg-green-100 text-green-600"
                            )}>
                                {stats.replied}
                            </span>
                        )}
                    </button>
                </div>

                {/* Content */}
                {isLoading ? (
                    <div className="flex items-center justify-center py-16">
                        <Loader className="w-8 h-8 text-blue-500 animate-spin" />
                    </div>
                ) : visibleNotes.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm text-center py-16">
                        <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500 font-bold">لا توجد ملحوظات بعد</p>
                        <p className="text-xs text-gray-400 font-bold mt-1">أضف الملحوظات من ملف الطالب</p>
                    </div>
                ) : filteredNotes.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm text-center py-16">
                        <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500 font-bold">لا توجد ملحوظات تطابق معايير البحث</p>
                        <button onClick={resetFilters} className="mt-4 text-xs font-black text-blue-600 hover:text-blue-700">
                            إعادة تعيين الفلاتر
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredNotes.map(noteCard)}
                    </div>
                )}
            </div>

            <EditStudentModal
                student={editStudent}
                isOpen={!!editStudent}
                onClose={() => {
                    setEditStudent(null);
                    refresh();
                }}
            />
        </div>
    );
}