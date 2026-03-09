// دوال مساعدة لحساب الحضور والغياب - مستقلة عن أي مكوّن

// دالة لحساب الغياب المتصل (محدثة لدعم تداخل الأشهر ومعالجة التكرار)
export const calculateContinuousAbsence = (attendance: any[]): number => {
    if (!attendance || attendance.length === 0) return 0;

    // توحيد السجلات لتجنب التكرار لليوم الواحد (الاحتفاظ بآخر حالة = الأحدث)
    const uniqueRecordsMap = new Map<string, any>();
    // البيانات مرتبة تصاعدياً (ASC) - فالأحدث يكتب فوق الأقدم
    attendance.forEach(a => {
        const dateStr = `${a.month}-${String(a.day).padStart(2, '0')}`;
        uniqueRecordsMap.set(dateStr, a);
    });

    const uniqueAttendance = Array.from(uniqueRecordsMap.values());

    // ترتيب من الأحدث للأقدم لبدء العد من اليوم الأخير
    const sortedAttendance = uniqueAttendance.sort((a, b) => {
        const dateA = new Date(a.month + '-' + String(a.day).padStart(2, '0'));
        const dateB = new Date(b.month + '-' + String(b.day).padStart(2, '0'));
        return dateB.getTime() - dateA.getTime();
    });

    let continuous = 0;
    for (let i = 0; i < sortedAttendance.length; i++) {
        if (sortedAttendance[i].status === 'absent') {
            continuous++;
        } else {
            // إذا وجدنا "حاضر"، نتوقف لأن السلسلة انقطعت
            break;
        }
    }
    return continuous;
};

// دالة لحساب إجمالي الغياب في شهر محدد (مع إزالة التكرار)
export const calculateTotalAbsence = (attendance: any[], targetMonth: string): number => {
    // نستخدم Set لضمان عدم تكرار العد لنفس اليوم إذا وجدت سجلات مكررة
    const uniqueDays = new Set(
        attendance
            .filter(a => a.status === 'absent' && a.month === targetMonth)
            .map(a => `${a.month}-${a.day}`)
    );
    return uniqueDays.size;
};
