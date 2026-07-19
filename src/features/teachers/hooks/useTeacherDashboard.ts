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

// دالة لحساب أيام العمل المتبقية من اليوم حتى نهاية الشهر (بدون الخميس والجمعة)
const countRemainingWorkDays = (currentDay: number, year: number, month: number) => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let count = 0;
    for (let day = currentDay + 1; day <= daysInMonth; day++) {
        const dow = new Date(year, month, day).getDay();
        if (dow !== 4 && dow !== 5) count++; // الخميس=4, الجمعة=5
    }
    return count;
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
    isSettlementMode: boolean = false, // إضافة وضع التصفية هنا
    allTeachers: any[] = [] // إضافة قائمة المعلمين هنا
) => {
    return useMemo(() => {
        if (!teacher) return null;

        const now = new Date();
        const currentDay = now.getDate();
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

        const teacherGroupIds = groups.filter(g => g.teacherId === teacher.id).map(g => g.id);

        // وظيفة للتحقق إذا كان المنشئ معلماً آخر
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
                
                // يتم تضمينها إذا حصلها المعلم (حتى لو انتقل الطالب) 
                // أو إذا كان طالب المعلم والمنشئ غير معروف (باعتبار المعلم حصله)
                return isCollectedByTeacher || (isTeacherStudent && (!f.createdBy || f.createdBy === 'غير معروف'));
            })
            .map(f => {
                const student = students.find(s => s.id === f.studentId);
                const isTeacherStudent = student && student.groupId && teacherGroupIds.includes(student.groupId);
                return {
                    id: f.receipt,
                    feeId: f.id,
                    studentName: student?.fullName || 'غير معروف',
                    amount: Number(f.amount.replace(/[^0-9.]/g, '')) || 0,
                    date: f.date,
                    groupName: groups.find(g => g.id === student?.groupId)?.name || '-',
                    isTransferred: student && !isTeacherStudent // وسم "منقول" إذا لم يعد في مجموعات هذا المعلم
                };
            });
        const totalCollected = collectedPayments.reduce((sum, p) => sum + p.amount, 0);

        // 3. حساب ما حصله المدير
        const managerCollectedPayments = allFees
            .filter(f => {
                const student = students.find(s => s.id === f.studentId);
                const isTeacherStudent = student && student.groupId && teacherGroupIds.includes(student.groupId);
                const isCollectedByThisTeacher = f.createdBy === teacher.fullName || (f.createdBy && normalize(f.createdBy) === normalize(teacher.fullName));
                
                // يظهر في "تحصيل المدير" فقط إذا كان الطالب حالياً في مجموعات المعلم
                // والتحصيل لم يتم بواسطة هذا المعلم، وأيضاً لم يتم بواسطة أي معلم آخر (أي بواسطة المدير/المشرف)
                return isTeacherStudent && !isCollectedByThisTeacher && !isOtherTeacher(f.createdBy) && f.createdBy && f.createdBy !== 'غير معروف';
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
        let basicSalary = 0;
        const isPartnership = teacher.accountingType === 'partnership';
        const standardWorkingDays = 22;
        
        // حساب إجمالي محصل المجموعة (كل الطلاب التابعين لمجموعات المدرس)
        const totalCollectedForGroup = allFees.filter(f => {
            const student = students.find(s => s.id === f.studentId);
            return student && student.groupId && teacherGroupIds.includes(student.groupId);
        }).reduce((sum, f) => sum + (Number(f.amount.replace(/[^0-9.]/g, '')) || 0), 0);

        if (isPartnership) {
            const percentage = Number(teacher.partnershipPercentage) || 0;
            basicSalary = (totalCollectedForGroup * percentage) / 100;
        } else {
            basicSalary = Number(teacher.salary) || 0;
        }

        // القيمة اليومية: للمرتب الثابت من راتبه، وللنسبة من المتوقع جمعه للمجموعة
        const dailyRate = isPartnership
            ? ((expectedExpenses * (Number(teacher.partnershipPercentage) || 0)) / 100) / standardWorkingDays
            : (Number(teacher.salary) || 1000) / standardWorkingDays;

        // حساب أيام الغياب من سجل الحضور (بما في ذلك partial)
        let absentDays = 0;
        Object.values(attendanceData || {}).forEach((status: any) => {
            if (status === 'absent') absentDays += 1;
            else if (status === 'half') absentDays += 0.5;
            else if (status === 'quarter') absentDays += 0.25;
        });

        // إجمالي أيام العمل في الشهر = 22 يوم افتراضي (ثابت)
        // في التصفية: اليوم الحالي = آخر يوم عمل، وباقي الشهر يُحتسب غياب
        const totalWorkingDays = standardWorkingDays;

        // في وضع التصفية: الأيام المتبقية من الشهر تُحتسب غياب (لأن المدرس أنهى عمله)
        // يتم حساب أيام العمل الفعلية فقط (بدون الخميس والجمعة)
        const remainingDaysInMonth = isSettlementMode
            ? countRemainingWorkDays(currentDay, now.getFullYear(), now.getMonth())
            : 0;

        // إجمالي أيام الغياب (بما فيها الأيام المتبقية في التصفية)
        const totalAbsentDays = absentDays + remainingDaysInMonth;

        // أيام الحضور الفعلية
        const attendedDays = Math.max(0, totalWorkingDays - totalAbsentDays);

        // الراتب الأساسي على أساس أيام الحضور فقط (للمرتب الثابت)
        const attendanceBasedSalary = isPartnership
            ? basicSalary
            : Math.round((dailyRate * attendedDays) * 100) / 100;

        // خصومات تلقائية (حسب الحضور)
        const autoDeductions = Math.round((absentDays * dailyRate) * 100) / 100;

        // خصم الأيام المتبقية في التصفية
        const remainingDaysDeduction = Math.round((remainingDaysInMonth * dailyRate) * 100) / 100;

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
                return dMonthRaw === selectedMonthRaw && !d.reason.startsWith('مكافأة:') && d.appliedBy !== 'system-automation';
            })
            .reduce((acc: number, curr) => acc + curr.amount, 0);

        const totalPaid = paymentsHistory.reduce((acc, curr) => acc + Number(curr.amount), 0);
        // الخصومات اليدوية تطبق دائماً
        // خصومات الغياب تطبق فقط لنظام النسبة (لأن المرتب الثابت محسوب على أيام الحضور)
        const totalDeductionsToApply = isPartnership ? autoDeductions + remainingDaysDeduction : 0;
        const totalEntitlement = Math.round((attendanceBasedSalary + autoRewards + manualRewardsTotal - manualDeductionsTotal - totalDeductionsToApply) * 100) / 100;
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

        // 7. فارق الأخذ - المبلغ الزائد الذي استلمه المدير فوق ما حصله المدرس
        const collectionOverage = Math.max(0, totalHandedOver - totalCollected);

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
            collectionOverage,
            salaryStats: {
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
                isPartnership,
                partnershipPercentage: teacher.partnershipPercentage,
                totalCollectedForGroup,
                expectedPartnershipSalary: isPartnership ? (expectedExpenses * (Number(teacher.partnershipPercentage) || 0)) / 100 : 0,
                totalWorkingDays,
                attendedDays,
                absentDays,
                totalAbsentDays,
                remainingDaysInMonth,
                remainingDaysDeduction
            }
        };
    }, [teacher, students, groups, allFees, selectedMonthRaw, attendanceData, handovers, exemptions, deductions, paymentsHistory, allTeachers, isSettlementMode]);
};