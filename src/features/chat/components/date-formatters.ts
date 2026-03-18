// features/chat/components/date-formatters.ts
import { format, isToday, isYesterday, isWithinInterval, subDays } from 'date-fns';
import { ar } from 'date-fns/locale';

export const formatLastSeen = (dateInput: string | Date | null | undefined): string => {
  if (!dateInput) return 'غير متصل';
  const date = new Date(dateInput);
  const time = format(date, 'h:mm a', { locale: ar });

  if (isToday(date)) return `آخر ظهور اليوم الساعة ${time}`;
  if (isYesterday(date)) return `آخر ظهور أمس الساعة ${time}`;

  const lastWeek = isWithinInterval(date, {
    start: subDays(new Date(), 7),
    end: new Date(),
  });

  if (lastWeek) return `آخر ظهور يوم ${format(date, 'eeee', { locale: ar })} الساعة ${time}`;

  return `آخر ظهور بتاريخ ${format(date, 'dd/MM/yyyy')} الساعة ${time}`;
};