-- =========================================================================
-- تحصين: تثبيت search_path لكل دوال نظام المراسلة (12 دالة) لمنع أي
-- تلاعب محتمل بترتيب البحث عن الأسماء (schema hijacking). لا يغيّر هذا
-- أي منطق داخل الدوال، فقط يضبط بيئة تنفيذها.
-- =========================================================================

ALTER FUNCTION public.is_conversation_allowed(p_participants text[], p_type text) SET search_path = public;
ALTER FUNCTION public.mark_messages_read(p_conversation_id uuid, p_actor text) SET search_path = public;
ALTER FUNCTION public.msg_create_conversation(p_token uuid, p_other text) SET search_path = public;
ALTER FUNCTION public.msg_get_contacts(p_token uuid) SET search_path = public;
ALTER FUNCTION public.msg_get_messages(p_token uuid, p_conversation_id uuid) SET search_path = public;
ALTER FUNCTION public.msg_list_conversations(p_token uuid) SET search_path = public;
ALTER FUNCTION public.msg_login(p_actor text, p_passcode text) SET search_path = public;
ALTER FUNCTION public.msg_mark_read(p_token uuid, p_conversation_id uuid) SET search_path = public;
ALTER FUNCTION public.msg_pin_message(p_token uuid, p_conversation_id uuid, p_message_id uuid, p_pin boolean) SET search_path = public;
ALTER FUNCTION public.msg_send_message(p_token uuid, p_conversation_id uuid, p_content text) SET search_path = public;
ALTER FUNCTION public.msg_verify_token(p_token uuid) SET search_path = public;
ALTER FUNCTION public.update_conversation_after_message() SET search_path = public;
