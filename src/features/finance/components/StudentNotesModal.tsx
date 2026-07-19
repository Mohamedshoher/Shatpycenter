"use client";

import X from 'lucide-react/dist/esm/icons/x'
import MessageSquare from 'lucide-react/dist/esm/icons/message-square'
import Users from 'lucide-react/dist/esm/icons/users'
import User from 'lucide-react/dist/esm/icons/user'
import Archive from 'lucide-react/dist/esm/icons/archive'
import Trash2 from 'lucide-react/dist/esm/icons/trash-2'
import CheckCircle2 from 'lucide-react/dist/esm/icons/check-circle-2'
import Circle from 'lucide-react/dist/esm/icons/circle'
import MessageCircle from 'lucide-react/dist/esm/icons/message-circle'
import ArrowRightLeft from 'lucide-react/dist/esm/icons/arrow-right-left'
import Reply from 'lucide-react/dist/esm/icons/reply'
import Send from 'lucide-react/dist/esm/icons/send';
import { cn, getWhatsAppUrl } from '@/lib/utils';
import { useState } from 'react';
import { FadeIn, SlideIn } from '@/components/ui/transition';
import { useAuthStore } from '@/store/useAuthStore';

interface StudentNote {
    id: string;
    content: string;
    createdAt: string;
    createdBy: string;
    studentId: string;
    studentName: string;
    parentPhone?: string;
    groupName: string;
    groupId: string | null;
    teacherName: string;
    isRead: boolean;
    reply?: string;
    repliedBy?: string;
    repliedAt?: string;
}

interface StudentNotesModalProps {
    isOpen: boolean;
    onClose: () => void;
    notes: StudentNote[];
    onArchiveStudent: (studentId: string) => void;
    onDeleteNote: (noteId: string) => void;
    onToggleRead: (noteId: string, currentStatus: boolean) => void;
    onStudentClick: (studentId: string) => void;
    onTransferStudent: (studentId: string) => void;
    onReplyToNote?: (noteId: string, reply: string) => void;
}

export default function StudentNotesModal({
    isOpen,
    onClose,
    notes,
    onArchiveStudent,
    onDeleteNote,
    onToggleRead,
    onStudentClick,
    onTransferStudent,
    onReplyToNote
}: StudentNotesModalProps) {
    const [activeTab, setActiveTab] = useState<'unread' | 'read'>('unread');
    const [replyingTo, setReplyingTo] = useState<string | null>(null);
    const [replyText, setReplyText] = useState('');
    const { user } = useAuthStore();

    const filteredNotes = notes.filter(n => activeTab === 'read' ? n.isRead : !n.isRead);

    const handleSendReply = (noteId: string) => {
        if (!replyText.trim()) return;
        onReplyToNote?.(noteId, replyText.trim());
        setReplyText('');
        setReplyingTo(null);
    };

    return (
        <>
            <FadeIn show={isOpen} className="fixed inset-0 z-[100]">
                <div onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            </FadeIn>
            <SlideIn show={isOpen} className="fixed inset-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[700px] max-h-[85vh] bg-white rounded-[40px] shadow-2xl z-[150] overflow-hidden flex flex-col border border-gray-100">
                {/* Header */}
                <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-white shrink-0">
                    <div className="text-right">
                        <h2 className="text-xl font-black text-gray-900">ملحوظات الطلاب</h2>
                        <p className="text-xs font-bold text-gray-400">سجل الملحوظات الإدارية والتعليمية</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="px-6 py-2 border-b border-gray-50 flex gap-4 bg-gray-50/30 shrink-0">
                    <button
                        onClick={() => setActiveTab('unread')}
                        className={cn(
                            "px-6 py-2 rounded-full text-xs font-black transition-all relative",
                            activeTab === 'unread' ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" : "text-gray-400 hover:bg-gray-100"
                        )}
                    >
                        ملحوظات جديدة
                        {notes.filter(n => !n.isRead).length > 0 && (
                            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center border-2 border-white">
                                {notes.filter(n => !n.isRead).length}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('read')}
                        className={cn(
                            "px-6 py-2 rounded-full text-xs font-black transition-all",
                            activeTab === 'read' ? "bg-green-600 text-white shadow-lg shadow-green-500/20" : "text-gray-400 hover:bg-gray-100"
                        )}
                    >
                        ملحوظات مقروءة
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar bg-gray-50/20">
                    {filteredNotes.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-gray-400 opacity-60">
                            <MessageSquare size={48} className="mb-4" />
                            <p className="font-bold">
                                {activeTab === 'read' ? 'لا توجد ملحوظات مقروءة' : 'لا توجد ملحوظات جديدة'}
                            </p>
                        </div>
                    ) : (
                        filteredNotes.map((note) => (
                            <div
                                key={note.id}
                                className="bg-white border border-gray-100 rounded-[32px] p-6 shadow-sm hover:shadow-xl hover:shadow-blue-500/5 transition-all group relative overflow-hidden"
                            >
                                <div className="flex flex-col gap-4">
                                    {/* Line 1: Student Name + Date */}
                                    <div className="flex items-center justify-between">
                                        <button
                                            onClick={() => onStudentClick(note.studentId)}
                                            className="font-black text-gray-900 text-lg hover:text-blue-600 transition-colors flex items-center gap-2 group/name"
                                        >
                                            <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 group-hover/name:bg-blue-600 group-hover/name:text-white transition-all">
                                                <User size={16} />
                                            </div>
                                            <span className="border-b-2 border-transparent group-hover/name:border-blue-600/30">{note.studentName}</span>
                                        </button>
                                        <p className="text-[10px] text-gray-400 font-bold">
                                            {note.createdAt ? new Date(note.createdAt).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long' }) : '---'}
                                        </p>
                                    </div>

                                    {/* Line 2: Action Icons */}
                                    <div className="flex items-center justify-end gap-1 bg-gray-50 p-1 rounded-2xl">
                                        {note.parentPhone && (
                                            <button
                                                onClick={() => {
                                                    const text = `السلام عليكم ورحمة الله وبركاته\n\nنود إحاطتكم علماً بملحوظة بخصوص الطالب/ة *${note.studentName}*:\n\n"${note.content}"\n\nمع تحيات إدارة مركز الشاطبي 🌹`;
                                                    window.open(getWhatsAppUrl(note.parentPhone || '', text), '_blank');
                                                }}
                                                className="w-9 h-9 flex items-center justify-center text-green-600 hover:text-green-700 hover:bg-white rounded-xl transition-all shadow-sm shadow-transparent hover:shadow-green-500/10"
                                                title="إرسال عبر واتساب"
                                            >
                                                <MessageCircle size={18} />
                                            </button>
                                        )}
                                        <button
                                            onClick={() => onDeleteNote(note.id)}
                                            className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-white rounded-xl transition-all shadow-sm shadow-transparent hover:shadow-red-500/10"
                                            title="حذف الملحوظة"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                        <button
                                            onClick={() => onArchiveStudent(note.studentId)}
                                            className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-amber-600 hover:bg-white rounded-xl transition-all shadow-sm shadow-transparent hover:shadow-amber-500/10"
                                            title="أرشفة الطالب"
                                        >
                                            <Archive size={18} />
                                        </button>
                                        <button
                                            onClick={() => onTransferStudent(note.studentId)}
                                            className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-white rounded-xl transition-all shadow-sm shadow-transparent hover:shadow-blue-500/10"
                                            title="نقل الطالب لمجموعة أخرى"
                                        >
                                            <ArrowRightLeft size={18} />
                                        </button>
                                        <button
                                            onClick={() => onToggleRead(note.id, note.isRead)}
                                            className={cn(
                                                "w-9 h-9 flex items-center justify-center rounded-xl transition-all shadow-sm shadow-transparent",
                                                note.isRead
                                                    ? "text-green-500 bg-white shadow-green-500/10 border border-green-50"
                                                    : "text-gray-400 hover:text-blue-600 hover:bg-white hover:shadow-blue-500/10"
                                            )}
                                            title={note.isRead ? "تعليم كغير مقروء" : "تعليم كمقروء"}
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

                                        {onReplyToNote && (
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
                                        )}
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
                        ))
                    )}
                </div>
            </SlideIn>
        </>
    );
}
