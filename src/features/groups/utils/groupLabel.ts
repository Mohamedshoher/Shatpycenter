import { Group, Teacher } from '@/types';

// اسم المجموعة متبوعاً بالاسم الأول لمدرّسها المسؤول عنها حالياً (يُحسب من بيانات
// المدرسين الحيّة، فيتحدّث تلقائياً فور تغيير مدرّس المجموعة)
export const getGroupLabel = (group: Group, teachers?: Teacher[]): string => {
    const teacher = teachers?.find((t) => t.id === group.teacherId);
    const firstName = teacher?.fullName?.trim().split(/\s+/)[0];
    return firstName ? `${group.name} - ${firstName}` : group.name;
};
