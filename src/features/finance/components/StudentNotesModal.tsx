"use client";

import { motion, AnimatePresence } from 'framer-motion';
import { X, MessageSquare, Users, User, Archive, Trash2, CheckCircle2, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface StudentNote {
    id: string;
    content: string;
    createdAt: string;
    createdBy: string;
    studentId: string;
    studentName: string;
    groupName: string;
    teacherName: string;
    isRead: boolean;
}

interface StudentNotesModalProps {
    isOpen: boolean;
    onClose: () => void;
    notes: StudentNote[];
    onArchiveStudent: (studentId: string) => void;
    onDeleteNote: (noteId: string) => void;
    onToggleRead: (noteId: string, currentStatus: boolean) => void;
}

export default function StudentNotesModal({
    isOpen,
    onClose,
    notes,
    onArchiveStudent,
    onDeleteNote,
    onToggleRead
}: StudentNotesModalProps) {
    const [activeTab, setActiveTab] = useState<'unread' | 'read'>('unread');

    const filteredNotes = notes.filter(n => activeTab === 'read' ? n.isRead : !n.isRead);

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed inset-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[700px] max-h-[85vh] bg-white rounded-[40px] shadow-2xl z-[101] overflow-hidden flex flex-col border border-gray-100"
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-white shrink-0">
                            <button
                                onClick={onClose}
                                className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all"
                            >
                                <X size={20} />
                            </button>
                            <div className="text-right">
                                <h2 className="text-xl font-black text-gray-900">ملحوظات الطلاب</h2>
                                <p className="text-xs font-bold text-gray-400">سجل الملحوظات الإدارية والتعليمية</p>
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="px-6 py-2 border-b border-gray-50 flex flex-row-reverse gap-4 bg-gray-50/30 shrink-0">
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
                        <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
                            {filteredNotes.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 text-gray-400 opacity-60">
                                    <MessageSquare size={48} className="mb-4" />
                                    <p className="font-bold">
                                        {activeTab === 'read' ? 'لا توجد ملحوظات مقروءة' : 'لا توجد ملحوظات جديدة'}
                                    </p>
                                </div>
                            ) : (
                                filteredNotes.map((note) => (
                                    <motion.div
                                        key={note.id}
                                        layout
                                        className="bg-white border border-gray-100 rounded-[28px] p-5 shadow-sm hover:shadow-md transition-all group relative overflow-hidden"
                                    >
                                        <div className="flex flex-col md:flex-row-reverse gap-4">
                                            {/* Left/Top: Info */}
                                            <div className="flex-1 space-y-3">
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => onDeleteNote(note.id)}
                                                            className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                            title="حذف الملحوظة"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                        <button
                                                            onClick={() => onArchiveStudent(note.studentId)}
                                                            className="p-2 text-gray-300 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                                                            title="أرشفة الطالب"
                                                        >
                                                            <Archive size={18} />
                                                        </button>
                                                        <button
                                                            onClick={() => onToggleRead(note.id, note.isRead)}
                                                            className={cn(
                                                                "p-2 rounded-lg transition-all",
                                                                note.isRead ? "text-green-500 bg-green-50" : "text-gray-300 hover:text-blue-600 hover:bg-blue-50"
                                                            )}
                                                            title={note.isRead ? "تعليم كغير مقروء" : "تعليم كمقروء"}
                                                        >
                                                            {note.isRead ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                                                        </button>
                                                    </div>
                                                    <div className="text-right">
                                                        <h3 className="font-black text-blue-600 text-lg">{note.studentName}</h3>
                                                        <p className="text-[10px] text-gray-400 font-bold">{new Date(note.createdAt).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                                                    </div>
                                                </div>

                                                <div className="bg-gray-50/80 rounded-2xl p-4 text-right">
                                                    <p className="text-sm font-bold text-gray-700 leading-relaxed">
                                                        {note.content}
                                                    </p>
                                                </div>

                                                <div className="flex flex-wrap flex-row-reverse gap-3 pt-1">
                                                    <div className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-[10px] font-black">
                                                        <Users size={12} />
                                                        {note.groupName}
                                                    </div>
                                                    <div className="flex items-center gap-1.5 bg-purple-50 text-purple-700 px-3 py-1 rounded-full text-[10px] font-black">
                                                        <User size={12} />
                                                        {note.teacherName}
                                                    </div>
                                                    <div className="flex items-center gap-1.5 bg-gray-50 text-gray-500 px-3 py-1 rounded-full text-[10px] font-bold mr-auto">
                                                        بواسطة: {note.createdBy}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
