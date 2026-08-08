"use client";

import { useState, useMemo, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User } from '@/types';
import { Conversation, Message, MessagingContact, MessagingContacts } from '@/types/messaging';
import { useMessaging } from '@/features/messaging/hooks/useMessaging';
import { useMessagingStore } from '@/features/messaging/store/useMessagingStore';
import { getMessagingActor } from '@/features/messaging/utils';
import { cn } from '@/lib/utils';
import MessageCircle from 'lucide-react/dist/esm/icons/message-circle'
import ArrowRight from 'lucide-react/dist/esm/icons/arrow-right'
import Search from 'lucide-react/dist/esm/icons/search'
import Send from 'lucide-react/dist/esm/icons/send'
import Pin from 'lucide-react/dist/esm/icons/pin'
import Plus from 'lucide-react/dist/esm/icons/plus'
import X from 'lucide-react/dist/esm/icons/x'
import Building2 from 'lucide-react/dist/esm/icons/building-2'
import GraduationCap from 'lucide-react/dist/esm/icons/graduation-cap'
import Users from 'lucide-react/dist/esm/icons/users'
import Loader from 'lucide-react/dist/esm/icons/loader'

interface Props {
    user: User;
    backHref: string;
}

type ContactTab = 'teachers' | 'parents';

export default function MessagingApp({ user, backHref }: Props) {
    const router = useRouter();
    const actor = useMessagingStore((s) => s.actor) || getMessagingActor(user);
    const token = useMessagingStore((s) => s.token);
    const {
        conversations,
        activeConvId,
        setActiveConvId,
        messages,
        contacts,
        loading,
        error,
        sending,
        sendMessage,
        openConversation,
        pinMessage,
    } = useMessaging(actor && token ? actor : null);

    const [showNewChat, setShowNewChat] = useState(false);
    const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');
    const [draft, setDraft] = useState('');
    const [search, setSearch] = useState('');
    const [contactTab, setContactTab] = useState<ContactTab>('teachers');
    const [newChatError, setNewChatError] = useState<string | null>(null);
    const [creating, setCreating] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);

    const activeConv = conversations.find((c) => c.id === activeConvId) || null;

    useEffect(() => {
        if (activeConvId) setMobileView('chat');
    }, [activeConvId]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages.length]);

    const getOther = (conv: Conversation) => {
        const idx = conv.participants[0] === actor ? 1 : 0;
        return { id: conv.participants[idx], name: conv.participant_names[idx] || conv.participants[idx] };
    };

    const otherOfActive = activeConv ? getOther(activeConv) : null;
    const pinned = useMemo(() => messages.filter((m) => m.is_pinned), [messages]);

    const sortedConversations = useMemo(
        () =>
            [...conversations].sort((a, b) => {
                const ta = a.last_message_at || a.created_at;
                const tb = b.last_message_at || b.created_at;
                return String(tb).localeCompare(String(ta));
            }),
        [conversations]
    );

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!draft.trim()) return;
        const content = draft;
        setDraft('');
        try {
            await sendMessage(content);
        } catch (err) {
            setDraft(content);
            alert(err instanceof Error ? err.message : 'تعذر إرسال الرسالة');
        }
    };

    const handlePickContact = async (other: string) => {
        setCreating(true);
        setNewChatError(null);
        try {
            await openConversation(other);
            setShowNewChat(false);
            setSearch('');
        } catch (err) {
            setNewChatError(err instanceof Error ? err.message : 'تعذر فتح المحادثة');
        } finally {
            setCreating(false);
        }
    };

    // ---------------- حالة عدم توفر جلسة مراسلة ----------------
    if (!actor || !token) {
        return (
            <div className="min-h-screen bg-gray-50/50 flex items-center justify-center p-6 font-sans" dir="rtl">
                <div className="bg-white rounded-[32px] p-10 max-w-md w-full text-center shadow-sm border border-gray-100 space-y-4">
                    <div className="w-16 h-16 bg-sky-50 rounded-3xl flex items-center justify-center text-sky-600 mx-auto">
                        <MessageCircle size={32} />
                    </div>
                    <h2 className="text-lg font-black text-gray-900">الرسائل غير متاحة</h2>
                    <p className="text-xs font-bold text-gray-400 leading-relaxed">
                        تحتاج لتسجيل الدخول مجدداً لتفعيل نظام المراسلة الداخلية.
                    </p>
                    <button
                        onClick={() => router.push(backHref)}
                        className="h-12 px-8 bg-sky-600 text-white rounded-2xl font-black text-sm hover:bg-sky-700 transition-colors"
                    >
                        العودة للصفحة الرئيسية
                    </button>
                </div>
            </div>
        );
    }

    // ---------------- الواجهة الرئيسية ----------------
    return (
        <div className="min-h-screen bg-gray-50/50 font-sans" dir="rtl">
            <div className="max-w-6xl mx-auto p-3 md:p-6 flex flex-col h-[calc(100dvh-0px)] md:h-[calc(100dvh-0px)]">
                {/* الهيدر */}
                <div className="flex items-center justify-between gap-3 bg-white rounded-3xl px-4 py-3 shadow-sm border border-gray-100 mb-3 shrink-0">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => router.push(backHref)}
                            className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors active:scale-95"
                        >
                            <ArrowRight size={20} />
                        </button>
                        <div className="flex items-center gap-2">
                            <div className="w-10 h-10 bg-sky-50 rounded-xl flex items-center justify-center text-sky-600">
                                <MessageCircle size={20} />
                            </div>
                            <div>
                                <h1 className="text-sm md:text-base font-black text-gray-900">الرسائل الداخلية</h1>
                                <p className="text-[10px] font-bold text-gray-400">{user.displayName}</p>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowNewChat(true)}
                        className="h-11 px-4 bg-sky-600 text-white rounded-2xl font-black text-xs md:text-sm flex items-center gap-2 hover:bg-sky-700 transition-colors shadow-lg shadow-sky-500/20 active:scale-95"
                    >
                        <Plus size={18} />
                        <span className="hidden sm:inline">محادثة جديدة</span>
                    </button>
                </div>

                {error ? (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="bg-white rounded-3xl p-8 text-center shadow-sm border border-gray-100 max-w-sm">
                            <p className="text-xs font-bold text-red-500 mb-4">{error}</p>
                            <p className="text-[11px] font-bold text-gray-400">
                                تأكد من نشر دالة المراسلة في Supabase (functions/v1/messaging) ثم أعد الدخول.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-[340px_1fr] gap-3">
                        {/* قائمة المحادثات */}
                        <div className={cn('md:block min-h-0', mobileView === 'chat' ? 'hidden' : 'block')}>
                            <ConversationList
                                conversations={sortedConversations}
                                activeConvId={activeConvId}
                                actor={actor}
                                loading={loading}
                                onSelect={(id) => setActiveConvId(id)}
                                onNew={() => setShowNewChat(true)}
                            />
                        </div>

                        {/* نافذة الدردشة */}
                        <div className={cn('min-h-0', mobileView === 'list' ? 'hidden md:block' : 'block')}>
                            {activeConv && otherOfActive ? (
                                <ChatWindow
                                    otherName={otherOfActive.name}
                                    messages={messages}
                                    pinned={pinned}
                                    actor={actor}
                                    draft={draft}
                                    setDraft={setDraft}
                                    sending={sending}
                                    onSend={handleSend}
                                    onPin={pinMessage}
                                    onBack={() => setMobileView('list')}
                                    bottomRef={bottomRef}
                                />
                            ) : (
                                <EmptyState onNew={() => setShowNewChat(true)} />
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* نافذة محادثة جديدة */}
            {showNewChat && (
                <NewChatModal
                    user={user}
                    contacts={contacts}
                    search={search}
                    setSearch={setSearch}
                    contactTab={contactTab}
                    setContactTab={setContactTab}
                    creating={creating}
                    error={newChatError}
                    onPick={handlePickContact}
                    onClose={() => setShowNewChat(false)}
                />
            )}
        </div>
    );
}

/* ============================ قائمة المحادثات ============================ */
function ConversationList({
    conversations,
    activeConvId,
    actor,
    loading,
    onSelect,
    onNew,
}: {
    conversations: Conversation[];
    activeConvId: string | null;
    actor: string;
    loading: boolean;
    onSelect: (id: string) => void;
    onNew: () => void;
}) {
    return (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 flex flex-col h-full min-h-0 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50 shrink-0">
                <div className="flex items-center gap-2">
                    <Users size={16} className="text-gray-400" />
                    <span className="text-xs font-black text-gray-700">المحادثات</span>
                    <span className="text-[10px] font-black text-sky-600 bg-sky-50 px-2 py-0.5 rounded-full">{conversations.length}</span>
                </div>
                <button onClick={onNew} className="w-8 h-8 bg-sky-50 text-sky-600 rounded-xl flex items-center justify-center hover:bg-sky-100 transition-colors active:scale-95">
                    <Plus size={16} />
                </button>
            </div>
            <div className="flex-1 overflow-y-auto no-scrollbar">
                {loading ? (
                    <div className="py-16 flex items-center justify-center text-gray-300">
                        <Loader size={24} className="animate-spin" />
                    </div>
                ) : conversations.length === 0 ? (
                    <div className="py-16 px-6 text-center space-y-3">
                        <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-300 mx-auto">
                            <MessageCircle size={26} />
                        </div>
                        <p className="text-xs font-bold text-gray-400">لا توجد محادثات بعد</p>
                        <button
                            onClick={onNew}
                            className="inline-flex h-10 px-4 bg-sky-600 text-white rounded-xl font-black text-xs items-center gap-2 hover:bg-sky-700 transition-colors"
                        >
                            <Plus size={14} />
                            ابدأ محادثة جديدة
                        </button>
                    </div>
                ) : (
                    conversations.map((conv) => {
                        const idx = conv.participants[0] === actor ? 1 : 0;
                        const name = conv.participant_names[idx] || conv.participants[idx];
                        const unread = conv.unread_counts?.[actor] || 0;
                        const time = conv.last_message_at || conv.created_at;
                        return (
                            <button
                                key={conv.id}
                                onClick={() => onSelect(conv.id)}
                                className={cn(
                                    "w-full flex items-center gap-3 px-4 py-3 text-right border-b border-gray-50/50 transition-colors",
                                    activeConvId === conv.id ? "bg-sky-50/70" : "hover:bg-gray-50/70"
                                )}
                            >
                                <div className={cn(
                                    "w-11 h-11 rounded-2xl flex items-center justify-center text-white font-black text-sm shrink-0",
                                    conv.participants[idx].startsWith('teacher:')
                                        ? "bg-gradient-to-br from-teal-500 to-emerald-600"
                                        : conv.participants[idx].startsWith('parent:')
                                            ? "bg-gradient-to-br from-indigo-500 to-violet-600"
                                            : "bg-gradient-to-br from-sky-500 to-blue-600"
                                )}>
                                    {name.trim().charAt(0) || '؟'}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="font-black text-gray-900 text-xs truncate">{name}</p>
                                        {time && (
                                            <span className="text-[9px] font-bold text-gray-400 shrink-0">
                                                {new Date(time).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center justify-between gap-2 mt-1">
                                        <p className="text-[10px] font-bold text-gray-400 truncate">
                                            {conv.last_message || 'لا رسائل بعد'}
                                        </p>
                                        {unread > 0 && (
                                            <span className="min-w-[20px] h-5 px-1.5 bg-sky-600 text-white text-[9px] font-black rounded-full flex items-center justify-center shrink-0">
                                                {unread}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </button>
                        );
                    })
                )}
            </div>
        </div>
    );
}

/* ============================ نافذة الدردشة ============================== */
function ChatWindow({
    otherName,
    messages,
    pinned,
    actor,
    draft,
    setDraft,
    sending,
    onSend,
    onPin,
    onBack,
    bottomRef,
}: {
    otherName: string;
    messages: Message[];
    pinned: Message[];
    actor: string;
    draft: string;
    setDraft: (v: string) => void;
    sending: boolean;
    onSend: (e: React.FormEvent) => void;
    onPin: (messageId: string, pin: boolean) => void;
    onBack: () => void;
    bottomRef: React.RefObject<HTMLDivElement | null>;
}) {
    return (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 flex flex-col h-full min-h-0 overflow-hidden">
            {/* رأس الدردشة */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 shrink-0">
                <button
                    onClick={onBack}
                    className="md:hidden w-9 h-9 bg-gray-50 rounded-xl flex items-center justify-center text-gray-500 active:scale-95"
                >
                    <ArrowRight size={18} />
                </button>
                <div className="w-10 h-10 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center font-black text-sm">
                    {otherName.trim().charAt(0) || '؟'}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="font-black text-gray-900 text-sm truncate">{otherName}</p>
                    <p className="text-[10px] font-bold text-emerald-500 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        محادثة داخلية
                    </p>
                </div>
            </div>

            {/* الرسائل المثبتة */}
            {pinned.length > 0 && (
                <div className="px-4 py-2 bg-amber-50/70 border-b border-amber-100/60 shrink-0">
                    <div className="flex items-center gap-1.5 mb-1.5">
                        <Pin size={12} className="text-amber-500" />
                        <span className="text-[10px] font-black text-amber-600">رسائل مثبتة ({pinned.length})</span>
                    </div>
                    <div className="space-y-1">
                        {pinned.map((m) => (
                            <div key={m.id} className="flex items-center gap-2 text-[10px] font-bold text-gray-600 bg-white/80 rounded-lg px-2.5 py-1.5 border border-amber-100">
                                <span className="text-amber-500 shrink-0">📌</span>
                                <span className="truncate flex-1">{m.content}</span>
                                <button onClick={() => onPin(m.id, false)} className="text-[9px] font-black text-amber-600 hover:text-amber-700 shrink-0">
                                    إلغاء التثبيت
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* الرسائل */}
            <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-4 space-y-2.5 bg-gray-50/40">
                {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-2">
                        <MessageCircle size={32} className="text-gray-200" />
                        <p className="text-xs font-bold text-gray-400">ابدأ المحادثة مع {otherName}</p>
                    </div>
                ) : (
                    messages.map((m) => {
                        const mine = m.sender_id === actor;
                        return (
                            <div key={m.id} className={cn("flex", mine ? "justify-start flex-row-reverse" : "justify-end")}>
                                <div className={cn(
                                    "max-w-[78%] rounded-3xl px-4 py-2.5 shadow-sm relative",
                                    mine
                                        ? "bg-sky-600 text-white rounded-tl-lg"
                                        : "bg-white text-gray-800 rounded-tr-lg border border-gray-100"
                                )}>
                                    {!mine && (
                                        <p className="text-[9px] font-black text-sky-600 mb-1">{m.sender_name}</p>
                                    )}
                                    <p className="text-xs md:text-sm font-bold leading-relaxed whitespace-pre-wrap break-words">{m.content}</p>
                                    <div className={cn("flex items-center justify-between gap-3 mt-1", mine ? "text-sky-200" : "text-gray-300")}>
                                        <span className="text-[9px] font-bold">
                                            {new Date(m.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                        <div className="flex items-center gap-1">
                                            {mine && m.read_by.length > 0 && (
                                                <span className="text-[9px] font-black">✓✓</span>
                                            )}
                                            <button
                                                onClick={() => onPin(m.id, !m.is_pinned)}
                                                className={cn(
                                                    "p-0.5 rounded transition-colors",
                                                    m.is_pinned ? "text-amber-500" : mine ? "hover:text-white text-sky-200" : "hover:text-amber-500 text-gray-300"
                                                )}
                                                title="تثبيت الرسالة"
                                            >
                                                <Pin size={11} className={m.is_pinned ? "fill-amber-400 text-amber-500" : ""} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={bottomRef} />
            </div>

            {/* صندوق الإرسال */}
            <form onSubmit={onSend} className="p-3 border-t border-gray-50 bg-white shrink-0">
                <div className="flex items-end gap-2">
                    <textarea
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                onSend(e);
                            }
                        }}
                        placeholder="اكتب رسالتك..."
                        rows={1}
                        className="flex-1 resize-none rounded-2xl bg-gray-50 border border-gray-100 px-4 py-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-300 max-h-32"
                    />
                    <button
                        type="submit"
                        disabled={sending || !draft.trim()}
                        className="h-11 w-11 bg-sky-600 text-white rounded-2xl flex items-center justify-center hover:bg-sky-700 transition-colors active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                    >
                        {sending ? <Loader size={18} className="animate-spin" /> : <Send size={18} />}
                    </button>
                </div>
            </form>
        </div>
    );
}

/* ============================ حالة فارغة ================================ */
function EmptyState({ onNew }: { onNew: () => void }) {
    return (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 h-full min-h-0 flex flex-col items-center justify-center p-8 text-center space-y-3">
            <div className="w-16 h-16 bg-sky-50 rounded-3xl flex items-center justify-center text-sky-600">
                <MessageCircle size={30} />
            </div>
            <p className="text-sm font-black text-gray-700">اختر محادثة للمتابعة</p>
            <p className="text-[11px] font-bold text-gray-400 max-w-[220px]">أو ابدأ محادثة جديدة مع المدرسين أو أولياء الأمور</p>
            <button
                onClick={onNew}
                className="mt-2 h-11 px-6 bg-sky-600 text-white rounded-2xl font-black text-xs flex items-center gap-2 hover:bg-sky-700 transition-colors shadow-lg shadow-sky-500/20 active:scale-95"
            >
                <Plus size={16} />
                محادثة جديدة
            </button>
        </div>
    );
}

/* ======================= نافذة بدء محادثة جديدة ========================== */
function NewChatModal({
    user,
    contacts,
    search,
    setSearch,
    contactTab,
    setContactTab,
    creating,
    error,
    onPick,
    onClose,
}: {
    user: User;
    contacts: MessagingContacts;
    search: string;
    setSearch: (v: string) => void;
    contactTab: ContactTab;
    setContactTab: (t: ContactTab) => void;
    creating: boolean;
    error: string | null;
    onPick: (other: string) => void;
    onClose: () => void;
}) {
    const isParent = user.role === 'parent';
    const isDirector = user.role === 'director';
    const isTeacher = user.role === 'teacher' || user.role === 'supervisor';

    const q = search.trim().toLowerCase();
    const phoneQ = q.replace(/[^0-9]/g, '');
    const filter = (list: MessagingContact[]) =>
        list.filter((c) => {
            if (!q) return true;
            const nameMatch = c.name.toLowerCase().includes(q);
            const phoneMatch = phoneQ.length > 0 && (c.phone ?? '').toLowerCase().includes(phoneQ);
            return nameMatch || phoneMatch;
        });

    const teachers = filter(contacts.teachers);
    const parents = filter(contacts.parents);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6">
            <div onClick={onClose} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <div className="relative w-full max-w-lg bg-white rounded-[32px] shadow-2xl h-[85dvh] md:h-auto md:max-h-[85dvh] flex flex-col overflow-hidden">
                {/* مقبض سحب (يظهر في الموبايل فقط) */}
                <div className="md:hidden pt-3 pb-1 flex justify-center shrink-0">
                    <div className="w-12 h-1.5 bg-gray-200 rounded-full" />
                </div>

                {/* الهيدر */}
                <div className="p-5 pt-2 md:pt-5 border-b border-gray-50 flex items-center justify-between shrink-0">
                    <div>
                        <h2 className="text-base font-black text-gray-900">محادثة جديدة</h2>
                        <p className="text-[10px] font-bold text-gray-400 mt-0.5">
                            {isParent ? 'مدرسو أبنائك والإدارة' : isTeacher ? 'زملاؤك وأولياء أمور طلابك' : 'جميع المدرسين وأولياء الأمور'}
                        </p>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors active:scale-95">
                        <X size={18} />
                    </button>
                </div>

                {/* بحث */}
                <div className="px-4 md:px-5 pt-4 shrink-0">
                    <div className="relative">
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="ابحث بالاسم أو رقم الهاتف..."
                            className="w-full h-12 bg-gray-50 border border-gray-100 rounded-2xl pr-10 pl-4 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                        />
                        <Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    </div>
                </div>

                {/* تبويبات الأدوار */}
                {(isDirector || isTeacher) && (
                    <div className="flex gap-2 px-4 md:px-5 pt-4 shrink-0">
                        <TabButton active={contactTab === 'teachers'} onClick={() => setContactTab('teachers')} label="المدرسون" count={contacts.teachers.length} />
                        <TabButton active={contactTab === 'parents'} onClick={() => setContactTab('parents')} label="أولياء الأمور" count={contacts.parents.length} />
                    </div>
                )}

                {/* القائمة */}
                <div className="flex-1 overflow-y-auto no-scrollbar p-3 md:p-4 space-y-1.5">
                    {(isParent || isTeacher) && (
                        <ContactRow
                            icon={<Building2 size={18} />}
                            name="إدارة المركز"
                            sub={isParent ? "مراسلة المدير (قناة تصعيد)" : "مراسلة المدير"}
                            gradient="from-sky-500 to-blue-600"
                            onClick={() => onPick('director:main')}
                            disabled={creating}
                        />
                    )}

                    {(contactTab === 'teachers' ? teachers : parents).map((c) => (
                        <ContactRow
                            key={c.id}
                            icon={<GraduationCap size={18} />}
                            name={c.name}
                            sub={c.kind === 'teacher' ? 'مدرس' : c.phone}
                            gradient={c.kind === 'teacher' ? 'from-teal-500 to-emerald-600' : 'from-indigo-500 to-violet-600'}
                            onClick={() => onPick(c.id)}
                            disabled={creating}
                        />
                    ))}

                    {(contactTab === 'teachers' ? teachers : parents).length === 0 && (
                        <p className="text-center text-xs font-bold text-gray-400 py-10">
                            {isParent ? 'لا يوجد مدرسون لأبنائك حالياً' : 'لا توجد نتائج مطابقة'}
                        </p>
                    )}
                </div>

                {error && (
                    <div className="px-5 pb-3 shrink-0">
                        <p className="text-[11px] font-bold text-red-500 bg-red-50 rounded-xl px-3 py-2 border border-red-100">{error}</p>
                    </div>
                )}
            </div>
        </div>
    );
}

function TabButton({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count: number }) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "flex-1 h-10 rounded-2xl text-xs font-black transition-all",
                active ? "bg-sky-600 text-white shadow-lg shadow-sky-500/20" : "bg-gray-50 text-gray-500 hover:bg-gray-100"
            )}
        >
            {label}
            <span className={cn("mr-1 text-[10px]", active ? "text-sky-100" : "text-gray-400")}>({count})</span>
        </button>
    );
}

function ContactRow({
    icon,
    name,
    sub,
    gradient,
    onClick,
    disabled,
}: {
    icon: React.ReactNode;
    name: string;
    sub: string;
    gradient: string;
    onClick: () => void;
    disabled: boolean;
}) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-sky-50/60 transition-colors text-right disabled:opacity-60"
        >
            <div className={cn("w-11 h-11 rounded-2xl flex items-center justify-center text-white shrink-0 bg-gradient-to-br", gradient)}>
                {icon}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-gray-900 truncate">{name}</p>
                <p className="text-[10px] font-bold text-gray-400 truncate">{sub}</p>
            </div>
        </button>
    );
}
