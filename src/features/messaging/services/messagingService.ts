import { Conversation, Message, MessagingContacts } from '@/types/messaging';
import { useMessagingStore } from '@/features/messaging/store/useMessagingStore';
import { supabase } from '@/lib/supabase';

/** إصدار توكن المراسلة بعد تسجيل دخول ناجح */
export const getMessagingToken = async (actor: string, passcode: string): Promise<{ token: string; actor: string }> => {
    const { data, error } = await supabase.rpc('msg_login', { p_actor: actor, p_passcode: passcode });
    if (error || !data) throw new Error(error?.message || 'تعذر إصدار توكن المراسلة');
    return { token: data, actor };
};

/** جلب محادثات المستخدم الحالي */
export const fetchConversations = async (actor: string): Promise<Conversation[]> => {
    const { token } = useMessagingStore.getState();
    if (!token) throw new Error('غير مصرح لك');
    
    const { data, error } = await supabase.rpc('msg_list_conversations', { p_token: token });
    if (error) throw new Error(error.message);
    return data || [];
};

/** جلب رسائل محادثة محددة */
export const fetchMessages = async (actor: string, conversationId: string): Promise<Message[]> => {
    const { token } = useMessagingStore.getState();
    if (!token) throw new Error('غير مصرح لك');

    const { data, error } = await supabase.rpc('msg_get_messages', { p_token: token, p_conversation_id: conversationId });
    if (error) throw new Error(error.message);
    return data || [];
};

/** إنشاء محادثة جديدة (أو إرجاع الموجودة بين نفس الطرفين) */
export const createConversation = async (
    actor: string,
    other: string
): Promise<Conversation> => {
    const { token } = useMessagingStore.getState();
    if (!token) throw new Error('غير مصرح لك');

    const { data, error } = await supabase.rpc('msg_create_conversation', { p_token: token, p_other: other });
    if (error || !data) throw new Error(error?.message || 'تعذر إنشاء المحادثة');
    return data;
};

/** إرسال رسالة */
export const sendMessage = async (
    actor: string,
    conversationId: string,
    content: string
): Promise<Message> => {
    const { token } = useMessagingStore.getState();
    if (!token) throw new Error('غير مصرح لك');

    const { data, error } = await supabase.rpc('msg_send_message', { p_token: token, p_conversation_id: conversationId, p_content: content });
    if (error || !data) throw new Error(error?.message || 'تعذر إرسال الرسالة');
    return data;
};

/** تعليم المحادثة كمقروءة */
export const markConversationRead = async (actor: string, conversationId: string): Promise<void> => {
    const { token } = useMessagingStore.getState();
    if (!token) return;

    await supabase.rpc('msg_mark_read', { p_token: token, p_conversation_id: conversationId });
};

/** تثبيت / إلغاء تثبيت رسالة */
export const setMessagePinned = async (
    actor: string,
    conversationId: string,
    messageId: string,
    pin: boolean
): Promise<void> => {
    const { token } = useMessagingStore.getState();
    if (!token) throw new Error('غير مصرح لك');

    await supabase.rpc('msg_pin_message', { p_token: token, p_conversation_id: conversationId, p_message_id: messageId, p_pin: pin });
};

/** جلب جهات الاتصال المسموح للمستخدم بمراسلتها */
export const fetchContacts = async (actor: string): Promise<MessagingContacts> => {
    const { token } = useMessagingStore.getState();
    if (!token) throw new Error('غير مصرح لك');

    const { data, error } = await supabase.rpc('msg_get_contacts', { p_token: token });
    if (error) throw new Error(error.message);
    return { teachers: data?.teachers || [], parents: data?.parents || [] };
};
