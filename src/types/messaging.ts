export type ConversationType =
    | 'director-teacher'
    | 'director-parent'
    | 'teacher-teacher'
    | 'teacher-parent';

export interface Conversation {
    id: string;
    participants: string[];
    participant_names: string[];
    last_message: string | null;
    last_message_at: string | null;
    unread_counts: Record<string, number>;
    type: ConversationType;
    created_at: string;
}

export interface Message {
    id: string;
    conversation_id: string;
    sender_id: string;
    sender_name: string;
    sender_role: string;
    content: string;
    read_by: string[];
    is_pinned: boolean;
    created_at: string;
}

export interface MessagingContact {
    id: string; // 'teacher:{id}' | 'parent:{phone}'
    name: string;
    phone: string;
    kind: 'teacher' | 'parent';
}

export interface MessagingContacts {
    teachers: MessagingContact[];
    parents: MessagingContact[];
}
