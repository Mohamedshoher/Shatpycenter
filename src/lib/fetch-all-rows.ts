/**
 * Supabase/PostgREST يحدّ أي استعلام بـ1000 صف افتراضياً، بغض النظر عن
 * .limit() المطلوب. هذه الدالة تجلب كل الصفوف فعلياً عبر صفحات .range()
 * متتالية حتى تنتهي، لتفادي اقتطاع البيانات بصمت على الجداول الكبيرة
 * (الحضور، الرسوم، الاختبارات...).
 */
export async function fetchAllRows<T = any>(
    buildQuery: (from: number, to: number) => any,
    pageSize = 1000
): Promise<T[]> {
    let all: T[] = [];
    let from = 0;
    while (true) {
        const { data, error } = await buildQuery(from, from + pageSize - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        all = all.concat(data as T[]);
        if (data.length < pageSize) break;
        from += pageSize;
    }
    return all;
}
