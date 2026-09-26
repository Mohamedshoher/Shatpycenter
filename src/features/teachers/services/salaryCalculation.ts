import { normalize } from '@/lib/utils';

// ==========================================================
// دالة واحدة موحّدة لحساب راتب المعلم
// تُستخدم في صفحة المعلم (تبويب الراتب) وصفحة المالية (حالة صرف الرواتب)
// لضمان تطابق النتائج بدقة متناهية بين الصفحتين.
// ==========================================================

export interface TeacherSalaryInput {
    teacher: any;
    students: any[];
    groups: any[];
    allFees: any[];
    handovers: any[];
    exemptions: any[];
    attendanceData: Record<string, any>;
    deductions: any[];
    paymentsHistory: any[];
    selectedMonthRaw: string;
    allTeachers: any[];
}

export interface TeacherSalaryStats {
    expectedExpenses: number;
    totalCollected: number;
    totalCollectedByManager: number;
    totalHandedOver: number;
    directorReceivedTotal: number;
    totalCollectedForGroup: number;
    basicSalary: number;
    attendanceBasedSalary: number;
    autoRewards: number;
    manualRewardsTotal: number;
    autoDeductions: number;
    manualDeductionsTotal: number;
    totalPaid: number;
    totalEntitlement: number;
    remainingToPay: number;
    dailyRate: number;
    hourlyRate: number;
    dailyHours: number;
    weeklyWorkingDays: number;
    isPartnership: boolean;
    partnershipPercentage: number;
    expectedPartnershipSalary: number;
    totalWorkingDays: number;
    attendedDays: number;
    absentDays: number;
    totalAbsentDays: number;
}

/**
 * دالة مساعدة لتحويل المبلغ إلى رقم بأمان حتى لو جاء كنص أو رقم
 */
export const parseAmount = (val: any): number => {
    if (val === null || val === undefined) return 0;
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    return Number(String(val).replace(/[^0-9.]/g, '')) || 0;
};

/**
 * استخراج مفتاح الشهر YYYY-MM من السلسلة دون التأثر بالمنطقة الزمنية
 */
export const getMonthKeyFromDate = (dateVal: any): string => {
    if (!dateVal) return '';
    if (typeof dateVal === 'string' && dateVal.length >= 7) {
        return dateVal.slice(0, 7);
    }
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return '';
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export const computeTeacherSalaryStats = (input: TeacherSalaryInput): TeacherSalaryStats => {
    const {
        teacher,
        students,
        groups,
        allFees,
        handovers,
        attendanceData,
        deductions,
        paymentsHistory,
        selectedMonthRaw,
        allTeachers
    } = input;

    const teacherGroupIds = groups.filter(g => g.teacherId === teacher.id).map(g => g.id);

    // Map لتحسين سرعة البحث عن الطالب في O(1) بدلاً من O(n)
    const studentMap = new Map<string, any>(students.map(s => [s.id, s]));

    // دالة للتحقق إذا كان المنشئ معلماً آخر
    const isOtherTeacher = (createdBy: string) => {
        if (!createdBy || createdBy === 'غير معروف') return false;
        const normalizedCreator = normalize(createdBy);
        return allTeachers.some(t =>
            t.id !== teacher.id && (
                normalize(t.fullName) === normalizedCreator ||
                t.phone === createdBy
            )
        );
    };

    // 1. المصروفات المتوقعة
    // تشمل الطلاب غير المؤرشفين أو الذين تم أرشفهم بعد الشهر المحدد
    const expectedExpenses = students
        .filter(s => {
            const isArchivedAfterSelectedMonth = s.status === 'archived' &&
                s.archivedDate && s.archivedDate.length >= 7 &&
                s.archivedDate.substring(0, 7) > selectedMonthRaw;
            const isMember = s.groupId && teacherGroupIds.includes(s.groupId) && (s.status !== 'archived' || isArchivedAfterSelectedMonth);
            if (!isMember) return false;
            return s.enrollmentDate && s.enrollmentDate.length >= 7 && s.enrollmentDate.substring(0, 7) <= selectedMonthRaw;
        })
        .reduce((sum, s) => sum + (Number(s.monthlyAmount) || 0), 0);

    // 2. ما حصله المعلم
    const totalCollected = allFees
        .filter(f => {
            const student = studentMap.get(f.studentId);
            const isTeacherStudent = student && student.groupId && teacherGroupIds.includes(student.groupId);
            const isCollectedByTeacher = (f.collectedById && f.collectedById === teacher.id) ||
                (f.collected_by_id && f.collected_by_id === teacher.id) ||
                f.createdBy === teacher.fullName ||
                f.createdBy === teacher.phone ||
                (f.createdBy && normalize(f.createdBy) === normalize(teacher.fullName));
            return isCollectedByTeacher || (isTeacherStudent && (!f.createdBy || f.createdBy === 'غير معروف'));
        })
        .reduce((sum, f) => sum + parseAmount(f.amount), 0);

    // 3. ما حصله المدير مباشرة
    const totalCollectedByManager = allFees
        .filter(f => {
            const student = studentMap.get(f.studentId);
            const isTeacherStudent = student && student.groupId && teacherGroupIds.includes(student.groupId);
            const isCollectedByThisTeacher = (f.collectedById && f.collectedById === teacher.id) ||
                (f.collected_by_id && f.collected_by_id === teacher.id) ||
                f.createdBy === teacher.fullName ||
                (f.createdBy && normalize(f.createdBy) === normalize(teacher.fullName));
            return isTeacherStudent && !isCollectedByThisTeacher && !isOtherTeacher(f.createdBy) && f.createdBy && f.createdBy !== 'غير معروف';
        })
        .reduce((sum, f) => sum + parseAmount(f.amount), 0);

    // 4. المبالغ المسلّمة للمدير
    const totalHandedOver = handovers.reduce((sum, h) => sum + parseAmount(h.amount), 0);

    // 5. إجمالي تحصيل المجموعة + إجمالي ما استلمه المدير (أساس حساب الشراكة)
    const totalCollectedForGroup = allFees
        .filter(f => {
            const student = studentMap.get(f.studentId);
            return student && student.groupId && teacherGroupIds.includes(student.groupId);
        })
        .reduce((sum, f) => sum + parseAmount(f.amount), 0);

    const directorReceivedTotal = totalCollectedByManager + totalHandedOver;

    // 6. الراتب الأساسي
    const isPartnership = teacher.accountingType === 'partnership';
    const dailyHours = Number(teacher.dailyHours) || 4;
    const weeklyWorkingDays = Number(teacher.weeklyWorkingDays) || 5;
    const standardWorkingDays = Math.max(1, Math.round(weeklyWorkingDays * 4.33));

    let basicSalary = 0;
    if (isPartnership) {
        const percentage = Number(teacher.partnershipPercentage) || 0;
        basicSalary = (directorReceivedTotal * percentage) / 100;
    } else {
        basicSalary = Number(teacher.salary) || 0;
    }

    // القيمة اليومية: للمرتب الثابت من راتبه، وللنسبة من المتوقع جمعه للمجموعة
    const dailyRate = isPartnership
        ? ((expectedExpenses * (Number(teacher.partnershipPercentage) || 0)) / 100) / standardWorkingDays
        : (Number(teacher.salary) || 0) / standardWorkingDays;

    // أجر الساعة الواحدة
    const hourlyRate = dailyHours > 0 ? dailyRate / dailyHours : 0;

    // 7. أيام الغياب من سجل الحضور
    let absentDays = 0;
    Object.values(attendanceData || {}).forEach((status: any) => {
        if (status === 'absent') absentDays += 1;
        else if (status === 'double_absent') absentDays += 2;
        else if (status === 'half') absentDays += 0.5;
        else if (status === 'quarter') absentDays += 0.25;
    });

    const totalWorkingDays = standardWorkingDays;
    const totalAbsentDays = absentDays;
    const attendedDays = Math.max(0, totalWorkingDays - totalAbsentDays);

    // الراتب الأساسي على أساس أيام الحضور فقط (للمرتب الثابت)
    const attendanceBasedSalary = isPartnership
        ? basicSalary
        : Math.round((dailyRate * attendedDays) * 100) / 100;

    // خصومات تلقائية (حسب الحضور)
    const autoDeductions = Math.round((absentDays * dailyRate) * 100) / 100;

    // مكافآت تلقائية (حسب الحضور)
    const autoRewards = Object.values(attendanceData || {}).reduce((acc: number, status: any) => {
        if (status === 'full_reward') return acc + dailyRate;
        if (status === 'half_reward') return acc + (dailyRate * 0.5);
        if (status === 'quarter_reward') return acc + (dailyRate * 0.25);
        return acc;
    }, 0);

    // مكافآت يدوية لهذا المعلم
    const manualRewardsTotal = deductions
        .filter(d => {
            const dMonthRaw = getMonthKeyFromDate(d.appliedDate);
            return d.teacherId === teacher.id && dMonthRaw === selectedMonthRaw && d.reason && d.reason.startsWith('مكافأة:');
        })
        .reduce((acc: number, curr) => acc + Math.abs(parseAmount(curr.amount)), 0);

    // خصومات يدوية لهذا المعلم
    const manualDeductionsTotal = deductions
        .filter(d => {
            const dMonthRaw = getMonthKeyFromDate(d.appliedDate);
            return d.teacherId === teacher.id && dMonthRaw === selectedMonthRaw && (!d.reason || !d.reason.startsWith('مكافأة:')) && d.appliedBy !== 'system-automation';
        })
        .reduce((acc: number, curr) => acc + parseAmount(curr.amount), 0);

    const totalPaid = paymentsHistory.reduce((acc, curr) => acc + parseAmount(curr.amount), 0);
    // الخصومات اليدوية تطبق دائماً
    // خصومات الغياب تطبق فقط لنظام النسبة (لأن المرتب الثابت محسوب على أيام الحضور)
    const totalDeductionsToApply = isPartnership ? autoDeductions : 0;
    const totalEntitlement = Math.round((attendanceBasedSalary + autoRewards + manualRewardsTotal - manualDeductionsTotal - totalDeductionsToApply) * 100) / 100;
    const remainingToPay = Math.max(0, Math.round((totalEntitlement - totalPaid) * 100) / 100);

    const expectedPartnershipSalary = isPartnership ? (expectedExpenses * (Number(teacher.partnershipPercentage) || 0)) / 100 : 0;

    return {
        expectedExpenses,
        totalCollected,
        totalCollectedByManager,
        totalHandedOver,
        directorReceivedTotal,
        totalCollectedForGroup,
        basicSalary,
        attendanceBasedSalary,
        autoRewards,
        manualRewardsTotal,
        autoDeductions,
        manualDeductionsTotal,
        totalPaid,
        totalEntitlement,
        remainingToPay,
        dailyRate,
        hourlyRate,
        dailyHours,
        weeklyWorkingDays,
        isPartnership,
        partnershipPercentage: teacher.partnershipPercentage,
        expectedPartnershipSalary,
        totalWorkingDays,
        attendedDays,
        absentDays,
        totalAbsentDays,
    };
};

