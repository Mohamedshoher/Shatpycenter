import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

/**
 * دالة بحث متدرجة: تبحث أولاً في الاسم الأول، إذا لم تجد تبحث في الثاني، ثم الثالث.
 */
export function tieredSearchFilter<T>(items: T[], searchTerm: string, getFullName: (item: T) => string): T[] {
    if (!searchTerm) return items;

    const search = searchTerm.toLowerCase().trim();
    // دالة توحيد الحروف العربية للمقارنة العادلة
    const normalize = (s: string) => s
        .replace(/[أإآ]/g, 'ا')
        .replace(/ة/g, 'ه')
        .replace(/ى/g, 'ي')
        .replace(/[ءئؤ]/g, '')
        .replace(/[ًٌٍَُِّ]/g, '')
        .trim();

    const normSearch = normalize(search);

    const getParts = (name: string) => normalize(name).toLowerCase().split(/\s+/).filter(Boolean);

    // المستوى 1: البحث في الاسم الأول
    const tier1 = items.filter(item => {
        const parts = getParts(getFullName(item));
        return parts[0] && parts[0].startsWith(normSearch);
    });
    if (tier1.length > 0) return tier1;

    // المستوى 2: البحث في الاسم الثاني
    const tier2 = items.filter(item => {
        const parts = getParts(getFullName(item));
        return parts[1] && parts[1].startsWith(normSearch);
    });
    if (tier2.length > 0) return tier2;

    // المستوى 3: البحث في باقي الأسماء (الثالث فأكثر)
    const tier3 = items.filter(item => {
        const parts = getParts(getFullName(item));
        return parts.slice(2).some(part => part.startsWith(normSearch));
    });

    return tier3;
}
