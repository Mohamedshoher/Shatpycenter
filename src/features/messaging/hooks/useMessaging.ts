import { useEffect, useRef, useState, useCallback } from 'react';
import { Conversation, Message, MessagingContacts } from '@/types/messaging';
import {
    fetchConversations,
    fetchMessages,
    fetchContacts,
    sendMessage as apiSendMessage,
    createConversation as apiCreateConversation,
    markConversationRead,
    setMessagePinned,
} from '@/features/messaging/services/messagingService';

/**
 * هوك إدارة المراسلة.
 * يستطلع المحادثات والرسائل بشكل دوري عبر Edge Function المحمية بدلاً من
 * Realtime، لأن الجداول محمية الآن بسياسات RLS تمنع المفتاح العام.
 */
export function useMessaging(actor: string | null) {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeConvId, setActiveConvId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [contacts, setContacts] = useState<MessagingContacts>({ teachers: [], parents: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [sending, setSending] = useState(false);
    const messagesRef = useRef<Message[]>([]);
    messagesRef.current = messages;

    // استطلاع قائمة المحادثات
    useEffect(() => {
        if (!actor) {
            setLoading(false);
            return;
        }
        let cancelled = false;
        const load = async () => {
            try {
                const list = await fetchConversations(actor);
                if (cancelled) return;
                setConversations(list);
                setLoading(false);
                setError(null);
            } catch (err) {
                if (!cancelled) {
                    setError(err instanceof Error ? err.message : 'تعذر تحميل المحادثات');
                    setLoading(false);
                }
            }
        };
        load();
        const id = setInterval(load, 6000);
        return () => {
            cancelled = true;
            clearInterval(id);
        };
    }, [actor]);

    // جهات الاتصال حسب الدور
    useEffect(() => {
        if (!actor) return;
        let cancelled = false;
        fetchContacts(actor)
            .then((c) => {
                if (!cancelled) setContacts(c);
            })
            .catch(() => {});
        return () => {
            cancelled = true;
        };
    }, [actor]);

    // استطلاع رسائل المحادثة النشطة + تعليم المقروء
    useEffect(() => {
        if (!actor || !activeConvId) {
            setMessages([]);
            return;
        }
        let cancelled = false;
        const load = async () => {
            try {
                const msgs = await fetchMessages(actor, activeConvId);
                if (cancelled) return;
                setMessages(msgs);

                const hasUnread = msgs.some(
                    (m) => m.sender_id !== actor && !m.read_by.includes(actor)
                );
                if (hasUnread) {
                    markConversationRead(actor, activeConvId)
                        .then(() => {
                            if (cancelled) return;
                            setConversations((prev) =>
                                prev.map((c) =>
                                    c.id === activeConvId
                                        ? { ...c, unread_counts: { ...c.unread_counts, [actor]: 0 } }
                                        : c
                                )
                            );
                        })
                        .catch(() => {});
                }
            } catch {
                // استطلاع هادئ
            }
        };
        load();
        const id = setInterval(load, 4000);
        return () => {
            cancelled = true;
            clearInterval(id);
        };
    }, [actor, activeConvId]);

    const sendMessage = useCallback(
        async (content: string) => {
            if (!actor || !activeConvId || !content.trim()) return null;
            setSending(true);
            try {
                const msg = await apiSendMessage(actor, activeConvId, content.trim());
                setMessages((prev) => [...prev, msg]);
                setConversations((prev) =>
                    prev.map((c) =>
                        c.id === activeConvId
                            ? { ...c, last_message: msg.content, last_message_at: msg.created_at }
                            : c
                    )
                );
                return msg;
            } finally {
                setSending(false);
            }
        },
        [actor, activeConvId]
    );

    const openConversation = useCallback(
        async (other: string) => {
            if (!actor) return null;
            const conv = await apiCreateConversation(actor, other);
            setConversations((prev) => {
                const exists = prev.some((c) => c.id === conv.id);
                return exists ? prev : [conv, ...prev];
            });
            setActiveConvId(conv.id);
            return conv;
        },
        [actor]
    );

    const pinMessage = useCallback(
        async (messageId: string, pin: boolean) => {
            if (!actor || !activeConvId) return;
            await setMessagePinned(actor, activeConvId, messageId, pin);
            setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, is_pinned: pin } : m)));
        },
        [actor, activeConvId]
    );

    return {
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
    };
}
