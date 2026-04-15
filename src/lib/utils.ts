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

    const normalize = (s: string) => s
        .replace(/[أإآ]/g, 'ا')
        .replace(/ة/g, 'ه')
        .replace(/ى/g, 'ي')
        .replace(/[ءئؤ]/g, '')
        .replace(/[ًٌٍَُِّ]/g, '')
        .toLowerCase()
        .trim();

    const normSearch = normalize(searchTerm);
    if (!normSearch) return items;

    const scored = items.map(item => {
        const fullName = getFullName(item);
        const name = normalize(fullName);
        const parts = name.split(/\s+/).filter(Boolean);

        let score = 0;

        // الحالة 1: الاسم يبدأ تماماً بكلمة البحث (الأولوية القصوى)
        if (name.startsWith(normSearch)) {
            score = 100;
        } 
        // الحالة 2: أي من الأسماء الداخلية يبدأ بكلمة البحث (مثلاً بحثت عن اسم الأب)
        else if (parts.some((p, i) => i > 0 && p.startsWith(normSearch))) {
            score = 80;
        }
        // الحالة 3: كلمة البحث موجودة في أي مكان (احتواء جزئي)
        else if (name.includes(normSearch)) {
            score = 40;
        }

        return { item, score };
    }).filter(x => x.score > 0);

    // الترتيب حسب الدرجة (الأقرب للأول يظهر أولاً)
    return scored.sort((a, b) => b.score - a.score).map(x => x.item);
}

/**
 * دالة لتنسيق رابط الواتساب بشكل صحيح ليعمل على جميع الأجهزة
 */
export function getWhatsAppUrl(phone: string, message?: string) {
    // تنظيف الرقم من أي مسافات أو رموز غير رقمية
    let cleanPhone = phone.replace(/[^0-9]/g, '');

    // إضافة كود الدولة (مصر) إذا كان الرقم يبدأ بـ 01
    if (cleanPhone.startsWith('01') && cleanPhone.length === 11) {
        cleanPhone = '2' + cleanPhone;
    }

    // استخدام الرابط المباشر من WhatsApp API لضمان الانتقال التلقائي للدردشة
    let url = `https://api.whatsapp.com/send?phone=${cleanPhone}`;
    
    if (message) {
        url += `&text=${encodeURIComponent(message)}`;
    }
    
    return url;
}
