// utils/chat-helpers.ts
import { format, isToday, isYesterday } from 'date-fns';
import { ar } from 'date-fns/locale';

/** تنسيق تاريخ الفاصل بين الرسائل **/
export const getSeparatorDate = (date: Date) => {
  if (isToday(date)) return 'اليوم';
  if (isYesterday(date)) return 'أمس';
  return format(date, 'eeee, d MMMM yyyy', { locale: ar });
};
/** تنظيف الـ ID من mock- وحروف المسافات **/
export const cleanId = (id: string) => id ? id.replace('mock-', '').toLowerCase().trim() : '';

/** استخراج معرف الطرف الآخر (المدرس أو ولي الأمر) وتجنب المدير **/
export const getOtherParticipantId = (participantIds: string[], currentUserId: string) => {
  const myId = cleanId(currentUserId);
  return participantIds.find(id => cleanId(id) !== myId) || null;
};