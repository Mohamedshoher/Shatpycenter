import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
    return clsx(inputs);
}

export function normalize(s: string): string {
    if (!s) return '';
    return s
        .replace(/[أإآ]/g, 'ا')
        .replace(/ة/g, 'ه')
        .replace(/ى/g, 'ي')
        .replace(/[ءئؤ]/g, '')
        .replace(/[ًٌٍَُِّ]/g, '')
        .replace(/\s+/g, '')
        .toLowerCase()
        .trim();
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

    // إزالة 00 في البداية (مفتاح دولي قديم)
    if (cleanPhone.startsWith('00')) {
        cleanPhone = cleanPhone.slice(2);
    }

    // إذا الرقم يبدأ بـ 02 ومتبوع برقم محمول (مثلاً 02010...) نزيل مفتاح المنطقة
    if (cleanPhone.startsWith('02') && cleanPhone.length > 11) {
        cleanPhone = cleanPhone.slice(2);
    }

    // إذا الرقم يبدأ بصفر، نحدد التعامل بناءً على ثاني رقم
    if (cleanPhone.startsWith('0')) {
        if (cleanPhone.startsWith('01')) {
            // رقم محمول مصري بدون مفتاح دولة (01X XXXXXXX)
            // نضيف مفتاح مصر: 2 + 01... = 201...
            cleanPhone = '2' + cleanPhone;
        } else {
            // رقم بصفر في البداية (مثل 02 للقاهرة أو 0XY)
            // نزيل الصفر ونضيف مفتاح مصر
            cleanPhone = '2' + cleanPhone.slice(1);
        }
    } else if (!cleanPhone.startsWith('2')) {
        // الرقم لا يبدأ بصفر ولا بمفتاح مصر - نفترض أنه محمول مصري
        cleanPhone = '2' + cleanPhone;
    }

    // استخدام الرابط المباشر wa.me لضمان الانتقال التلقائي للدردشة بسرعة
    let url = `https://wa.me/${cleanPhone}`;
    
    if (message) {
        url += `?text=${encodeURIComponent(message)}`;
    }
    
    return url;
}
