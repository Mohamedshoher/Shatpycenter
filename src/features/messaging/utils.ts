import { User } from '@/types';

/**
 * استخراج معرّف المستخدم بصيغة النظام الموحّدة:
 *   director:main | teacher:{id} | parent:{phone}
 * يعيد null إن كان المستخدم غير قادر على المراسلة.
 */
export function getMessagingActor(user: User | null): string | null {
    if (!user) return null;
    if (user.role === 'director') return 'director:main';
    if ((user.role === 'teacher' || user.role === 'supervisor') && user.teacherId) {
        return `teacher:${user.teacherId}`;
    }
    if (user.role === 'parent' && user.displayName) {
        return `parent:${user.displayName}`;
    }
    return null;
}

/** هل يمكن للمستخدم استخدام نظام المراسلة؟ */
export function canUseMessaging(user: User | null): boolean {
    return !!getMessagingActor(user);
}

/** تسمية عامة مختصرة لهوية ما */
export function shortActorId(actor: string): string {
    const idx = actor.indexOf(':');
    return idx >= 0 ? actor.slice(idx + 1) : actor;
}
