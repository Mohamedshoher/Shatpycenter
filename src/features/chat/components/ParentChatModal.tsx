'use client';

import { useState } from 'react';
import { useChat } from '../hooks/useChat';
import { ConversationList } from './ConversationList';
import { MessageArea } from './MessageArea';
import { MessageInput } from './MessageInput';
import { X, Search, UserPlus, MessageCircle, ArrowRight } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { chatService } from '../services/chatService';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useStudents } from '@/features/students/hooks/useStudents';

interface ParentChatModalProps {
    isOpen: boolean;
    onClose: () => void;
    contacts: any[];
}

export const ParentChatModal: React.FC<ParentChatModalProps> = ({ isOpen, onClose, contacts }) => {
    const { user } = useAuthStore();
    const { data: students } = useStudents();
    const [view, setView] = useState<'conversations' | 'contacts'>('conversations');
    const [searchQuery, setSearchQuery] = useState('');

    const userId = user?.uid || '';
    const userRole = 'parent';

    const parentDescriptiveName = (students || []).filter(s => s.parentPhone === user?.displayName).length > 0
        ? `ولي أمر ${(students || []).filter(s => s.parentPhone === user?.displayName).map(k => k.fullName).join(' و ')}`
        : user?.displayName || 'ولي أمر';

    const {
        conversations,
        selectedConversation,
        messages,
        loading,
        sending,
        selectConversation,
        sendMessage,
    } = useChat(userId, userRole, parentDescriptiveName);

    const startConversation = async (contact: any) => {
        if (!user) return;

        // تجهيز اسم ولي الأمر بشكل وصفي (ولي أمر الطالب فلان)
        const parentPhone = user.displayName || "";
        const myKids = students?.filter(s => s.parentPhone === parentPhone) || [];
        const parentDescriptiveName = myKids.length > 0
            ? `ولي أمر ${myKids.map(k => k.fullName).join(' و ')}`
            : parentPhone || 'ولي أمر';

        try {
            const convo = await chatService.getOrCreateConversation(
                [user.uid, contact.id === 'director' ? 'director' : contact.id],
                [parentDescriptiveName, contact.fullName],
                contact.id === 'director' ? 'director-teacher' : 'teacher-parent' as any
            );
            selectConversation(convo);
            setView('conversations');
        } catch (err) {
            console.error("Error starting conversation:", err);
        }
    };

    const filteredConversations = conversations.filter((conv) =>
        conv.participantNames.some((name) =>
            name.toLowerCase().includes(searchQuery.toLowerCase())
        )
    );

    const filteredContacts = contacts.filter((c) =>
        c.fullName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" dir="rtl">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white rounded-[40px] w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden relative z-10 shadow-2xl"
            >
                {/* Header */}
                <div className="bg-white border-b border-gray-100 p-6 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                            <MessageCircle size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-gray-900 leading-none">المراسلة الداخلية</h2>
                            <p className="text-xs text-gray-400 font-bold mt-1">تواصل مع الإدارة والمدرسين</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-all">
                        <X size={24} />
                    </button>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    {/* Sidebar */}
                    <div className={cn(
                        "w-full md:w-80 flex flex-col border-l border-gray-100 transition-all shrink-0",
                        selectedConversation && "hidden md:flex"
                    )}>
                        {/* Tabs */}
                        <div className="p-4 bg-gray-50/50 flex gap-2">
                            <button
                                onClick={() => setView('conversations')}
                                className={cn(
                                    "flex-1 py-2.5 rounded-xl text-xs font-bold transition-all",
                                    view === 'conversations' ? "bg-white text-indigo-600 shadow-sm" : "text-gray-400 hover:text-gray-600"
                                )}
                            >
                                المحادثات
                            </button>
                            <button
                                onClick={() => setView('contacts')}
                                className={cn(
                                    "flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2",
                                    view === 'contacts' ? "bg-white text-indigo-600 shadow-sm" : "text-gray-400 hover:text-gray-600"
                                )}
                            >
                                <UserPlus size={14} />
                                جهات الاتصال
                            </button>
                        </div>

                        {/* Search */}
                        <div className="p-4">
                            <div className="relative">
                                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="بحث..."
                                    className="w-full pr-10 pl-4 py-2.5 bg-gray-50 border-none rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500/20"
                                />
                            </div>
                        </div>

                        {/* List */}
                        <div className="flex-1 overflow-y-auto">
                            {view === 'conversations' ? (
                                <ConversationList
                                    conversations={filteredConversations}
                                    selectedId={selectedConversation?.id}
                                    onSelect={selectConversation}
                                />
                            ) : (
                                <div className="divide-y divide-gray-50">
                                    {filteredContacts.map((contact: any) => (
                                        <button
                                            key={contact.id}
                                            onClick={() => startConversation(contact)}
                                            className="w-full p-4 flex items-center gap-3 hover:bg-gray-50 transition-all text-right group"
                                        >
                                            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                                <UserPlus size={18} />
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="font-bold text-sm text-gray-900">{contact.fullName}</h4>
                                                <p className="text-[10px] text-gray-400 font-bold">
                                                    {contact.role === 'director' ? 'المدير العام' : contact.role === 'supervisor' ? 'مشرف تربوي' : 'مدرس المجموعة'}
                                                </p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Chat Content */}
                    <div className={cn(
                        "flex-1 flex flex-col bg-gray-50/30 overflow-hidden",
                        !selectedConversation && "hidden md:flex"
                    )}>
                        {selectedConversation ? (
                            <>
                                <div className="bg-white border-b border-gray-100 p-4 flex items-center justify-between shrink-0">
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => selectConversation(null as any)}
                                            className="md:hidden w-8 h-8 flex items-center justify-center text-gray-400"
                                        >
                                            <ArrowRight size={20} />
                                        </button>
                                        <div>
                                            <h3 className="font-black text-gray-900">
                                                {(() => {
                                                    const clean = (id: string) => id ? id.replace('mock-', '').toLowerCase().trim() : '';
                                                    const myId = clean(userId);
                                                    const otherIndex = selectedConversation.participantIds.findIndex(id => clean(id) !== myId);
                                                    return selectedConversation.participantNames[otherIndex === -1 ? 0 : otherIndex] || 'محادثة';
                                                })()}
                                            </h3>
                                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-teal-600">
                                                <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
                                                متصل الآن
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex-1 overflow-hidden flex flex-col bg-white/50">
                                    <MessageArea
                                        conversation={selectedConversation}
                                        messages={messages}
                                        currentUserId={userId}
                                        showHeader={false}
                                    />
                                    <div className="p-4 bg-white border-t border-gray-100">
                                        <MessageInput onSend={sendMessage} disabled={sending} />
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-6 text-center">
                                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                    <MessageCircle size={40} className="opacity-20" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-600">ابدأ المحادثة</h3>
                                <p className="text-sm max-w-xs mt-2">اختر أحد المدرسين أو الإدارة للتواصل معهم بخصوص أبنائك.</p>
                            </div>
                        )}
                    </div>
                </div>
            </motion.div>
        </div>
    );
};
