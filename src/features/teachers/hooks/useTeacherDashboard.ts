import { useMemo } from 'react';

// دالة مساعدة لتوحيد النصوص (نفس التي في كودك)
const normalize = (s: string) => {
    if (!s) return '';
    return s
        .replace(/[أإآ]/g, 'ا')
        .replace(/ة/g, 'ه')
        .replace(/ى/g, 'ي')
        .replace(/[ءئؤ]/g, '')
        .replace(/[ًٌٍَُِّ]/g, '')
        .replace(/\s+/g, '')
        .trim();
};

export const useTeacherDashboard = (
    teacher: any,
    students: any[] = [],
    groups: any[] = [],
    allFees: any[] = [],
    handovers: any[] = [],
    exemptions: any[] = [],
    attendanceData: any = {},
    deductions: any[] = [],
    paymentsHistory: any[] = [],
    selectedMonthRaw: string,
    isSettlementMode: boolean = false // إضافة وضع التصفية هنا
) => {
    return useMemo(() => {
        if (!teacher) return null;

        const now = new Date();
        const currentDay = now.getDate();
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

        const teacherGroupIds = groups.filter(g => g.teacherId === teacher.id).map(g => g.id);

        // 1. حساب المصروفات المتوقعة
        const expectedExpenses = students
            .filter(s => {
                const isMember = s.groupId && teacherGroupIds.includes(s.groupId) && s.status !== 'archived';
                if (!isMember) return false;
                if (s.enrollmentDate) {
                    return s.enrollmentDate.substring(0, 7) <= selectedMonthRaw;
                }
                return true;
            })
            .reduce((sum, s) => sum + (Number(s.monthlyAmount) || 0), 0);

        // 2. حساب ما حصله المعلم
        const collectedPayments = allFees
            .filter(f => {
                const student = students.find(s => s.id === f.studentId);
                const isTeacherStudent = student && student.groupId && teacherGroupIds.includes(student.groupId);
                const isCollectedByTeacher = f.createdBy === teacher.fullName || 
                                           f.createdBy === teacher.phone || 
                                           (f.createdBy && normalize(f.createdBy) === normalize(teacher.fullName));
                return isCollectedByTeacher || (isTeacherStudent && (!f.createdBy || f.createdBy === 'غير معروف'));
            })
            .map(f => {
                const student = students.find(s => s.id === f.studentId);
                return {
                    id: f.receipt,
                    feeId: f.id,
                    studentName: student?.fullName || 'غير معروف',
                    amount: Number(f.amount.replace(/[^0-9.]/g, '')) || 0,
                    date: f.date,
                    groupName: groups.find(g => g.id === student?.groupId)?.name || '-'
                };
            });
        const totalCollected = collectedPayments.reduce((sum, p) => sum + p.amount, 0);

        // 3. حساب ما حصله المدير
        const managerCollectedPayments = allFees
            .filter(f => {
                const isTeacherStudent = students.find(s => s.id === f.studentId && s.groupId && teacherGroupIds.includes(s.groupId));
                const isCollectedByTeacher = f.createdBy === teacher.fullName || (f.createdBy && normalize(f.createdBy) === normalize(teacher.fullName));
                return isTeacherStudent && !isCollectedByTeacher && f.createdBy && f.createdBy !== 'غير معروف';
            })
            .map(f => {
                const student = students.find(s => s.id === f.studentId);
                return {
                    id: f.receipt,
                    feeId: f.id,
                    studentName: student?.fullName || 'غير معروف',
                    amount: Number(f.amount.replace(/[^0-9.]/g, '')) || 0,
                    date: f.date,
                    groupName: groups.find(g => g.id === student?.groupId)?.name || '-'
                };
            });
        const totalCollectedByManager = managerCollectedPayments.reduce((sum, p) => sum + p.amount, 0);

        // 4. الراتب
        let basicSalary = teacher.salary || 1000;
        
        // إذا كان المدرس سيصفي حسابه في وسط الشهر، نحسب له الراتب الأساسي نسبة لليوم
        if (isSettlementMode) {
            basicSalary = Math.round((basicSalary / daysInMonth) * currentDay);
        }

        const dailyRate = (teacher.salary || 1000) / 22; // معدل اليوم يظل ثابتاً للحسابات الدقيقة
        
        // خصومات تلقائية (حسب الحضور)
        const autoDeductions = Object.values(attendanceData || {}).reduce((acc: number, status: any) => {
            if (status === 'absent') return acc + dailyRate;
            if (status === 'half') return acc + (dailyRate * 0.5);
            if (status === 'quarter') return acc + (dailyRate * 0.25);
            return acc;
        }, 0);

        // مكافآت تلقائية (حسب الحضور)
        const autoRewards = Object.values(attendanceData || {}).reduce((acc: number, status: any) => {
            if (status === 'full_reward') return acc + dailyRate;
            if (status === 'half_reward') return acc + (dailyRate * 0.5);
            if (status === 'quarter_reward') return acc + (dailyRate * 0.25);
            return acc;
        }, 0);

        // مكافآت يدوية
        const manualRewardsTotal = deductions
            .filter(d => {
                const dDate = new Date(d.appliedDate);
                const dMonthRaw = `${dDate.getFullYear()}-${String(dDate.getMonth() + 1).padStart(2, '0')}`;
                return dMonthRaw === selectedMonthRaw && d.reason.startsWith('مكافأة:');
            })
            .reduce((acc: number, curr) => acc + Math.abs(curr.amount), 0);

        // خصومات يدوية
        const manualDeductionsTotal = deductions
            .filter(d => {
                const dDate = new Date(d.appliedDate);
                const dMonthRaw = `${dDate.getFullYear()}-${String(dDate.getMonth() + 1).padStart(2, '0')}`;
                return dMonthRaw === selectedMonthRaw && !d.reason.startsWith('مكافأة:');
            })
            .reduce((acc: number, curr) => acc + curr.amount, 0);

        const totalPaid = paymentsHistory.reduce((acc, curr) => acc + Number(curr.amount), 0);
        const totalEntitlement = Math.round((basicSalary + autoRewards + manualRewardsTotal - autoDeductions - manualDeductionsTotal) * 100) / 100;
        const remainingToPay = Math.max(0, Math.round((totalEntitlement - totalPaid) * 100) / 100);

        // 5. الطلاب الذين لم يدفعوا
        const exemptedStudentIds = exemptions.map((e: any) => e.student_id);
        const unpaidStudents = students
            .filter(s => {
                const isMember = s.groupId && teacherGroupIds.includes(s.groupId) && s.status !== 'archived';
                if (!isMember) return false;
                if (s.enrollmentDate) {
                    return s.enrollmentDate.substring(0, 7) <= selectedMonthRaw;
                }
                return true;
            })
            .map(student => {
                const studentFees = allFees.filter(f => f.studentId === student.id);
                const totalPaidByStudent = studentFees.reduce((sum, f) => sum + (Number(f.amount.replace(/[^0-9.]/g, '')) || 0), 0);
                const expectedAmount = Number(student.monthlyAmount) || 0;
                const remaining = expectedAmount - totalPaidByStudent;
                const isExempted = exemptedStudentIds.includes(student.id);
                return {
                    id: student.id,
                    name: student.fullName,
                    groupName: groups.find(g => g.id === student.groupId)?.name || '-',
                    expectedAmount,
                    paidAmount: totalPaidByStudent,
                    remaining: Math.max(0, remaining),
                    isExempted,
                    enrollmentDate: student.enrollmentDate
                };
            })
            .filter(s => s.remaining > 0 || s.isExempted);

        const realDeficit = unpaidStudents
            .filter(s => !s.isExempted)
            .reduce((sum, s) => sum + s.remaining, 0);

        // 6. تاريخ التسليمات
        const collectionHistoryMapped = handovers.map(h => ({
            id: h.id,
            date: h.date,
            timestamp: h.timestamp, // إضافة التوقيت الفعلي هنا
            monthRaw: selectedMonthRaw,
            amount: String(h.amount),
            notes: h.description || '-',
            type: 'تحصيل نقدي'
        }));
        const totalHandedOver = handovers.reduce((sum, h) => sum + Number(h.amount), 0);

        return {
            expectedExpenses,
            collectedPayments,
            totalCollected,
            managerCollectedPayments,
            totalCollectedByManager,
            unpaidStudents,
            realDeficit,
            collectionHistoryMapped,
            totalHandedOver,
            salaryStats: {
                basicSalary,
                autoRewards,
                manualRewardsTotal,
                autoDeductions,
                manualDeductionsTotal,
                totalPaid,
                totalEntitlement,
                remainingToPay,
                dailyRate
            }
        };
    }, [teacher, students, groups, allFees, selectedMonthRaw, attendanceData, handovers, exemptions, deductions, paymentsHistory]);
};