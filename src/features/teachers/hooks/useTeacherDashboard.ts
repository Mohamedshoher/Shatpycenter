import { useMemo } from 'react';
import { normalize } from '@/lib/utils';
import { computeTeacherSalaryStats, TeacherSalaryStats } from '@/features/teachers/services/salaryCalculation';

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
    allTeachers: any[] = [] // إضافة قائمة المعلمين هنا
) => {
    return useMemo(() => {
        if (!teacher) return null;

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

        // 1. حساب ما حصله المعلم (قائمة تفاصيل)
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

        // 2. حساب ما حصله المدير (قائمة تفاصيل)
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

        // 3. حساب الراتب والإحصائيات المالية (دالة موحّدة مع صفحة المالية لضمان التطابق)
        const salaryStats: TeacherSalaryStats = computeTeacherSalaryStats({
            teacher,
            students,
            groups,
            allFees,
            handovers,
            exemptions,
            attendanceData,
            deductions,
            paymentsHistory,
            selectedMonthRaw,
            allTeachers
        });

        const {
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
            partnershipPercentage,
            expectedPartnershipSalary,
            totalWorkingDays,
            attendedDays,
            absentDays,
            totalAbsentDays
        } = salaryStats;

        // 4. الطلاب الذين لم يدفعوا
        const exemptedStudentIds = exemptions.map((e: any) => e.student_id);
        const unpaidStudents = students
            .filter(s => {
                const isMember = s.groupId && teacherGroupIds.includes(s.groupId) && s.status !== 'archived';
                if (!isMember) return false;
                return s.enrollmentDate && s.enrollmentDate.length >= 7 && s.enrollmentDate.substring(0, 7) <= selectedMonthRaw;
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
                    enrollmentDate: student.enrollmentDate,
                    phone: student.phone,
                    parentPhone: student.parentPhone
                };
            })
            .filter(s => s.remaining > 0 || s.isExempted);

        const realDeficit = unpaidStudents
            .filter(s => !s.isExempted)
            .reduce((sum, s) => sum + s.remaining, 0);

        // 5. تاريخ التسليمات
        const collectionHistoryMapped = handovers.map(h => ({
            id: h.id,
            date: h.date,
            timestamp: h.timestamp, // إضافة التوقيت الفعلي هنا
            monthRaw: selectedMonthRaw,
            amount: String(h.amount),
            notes: h.description || '-',
            type: 'تحصيل نقدي'
        }));

        // 6. فارق الأخذ - المبلغ الزائد الذي استلمه المدير فوق ما حصله المدرس
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
            salaryStats
        };
    }, [teacher, students, groups, allFees, selectedMonthRaw, attendanceData, handovers, exemptions, deductions, paymentsHistory, allTeachers]);
};
