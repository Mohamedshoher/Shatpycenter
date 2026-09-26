import { describe, it, expect } from 'vitest';
import { computeTeacherSalaryStats, parseAmount, getMonthKeyFromDate } from '../salaryCalculation';

describe('salaryCalculation utils', () => {
    it('parseAmount handles numbers, strings, null, and formatted currencies', () => {
        expect(parseAmount(1000)).toBe(1000);
        expect(parseAmount('1000')).toBe(1000);
        expect(parseAmount('1,500.50')).toBe(1500.5);
        expect(parseAmount('EGP 2,000')).toBe(2000);
        expect(parseAmount(null)).toBe(0);
        expect(parseAmount(undefined)).toBe(0);
        expect(parseAmount('invalid')).toBe(0);
    });

    it('getMonthKeyFromDate extracts YYYY-MM safely', () => {
        expect(getMonthKeyFromDate('2026-05-15')).toBe('2026-05');
        expect(getMonthKeyFromDate('2026-05-15T12:00:00Z')).toBe('2026-05');
        expect(getMonthKeyFromDate(null)).toBe('');
    });
});

describe('computeTeacherSalaryStats', () => {
    const baseTeacher = {
        id: 't-1',
        fullName: 'أحمد علي',
        accountingType: 'fixed',
        salary: 2000,
        dailyHours: 4,
        weeklyWorkingDays: 5,
        partnershipPercentage: 0
    };

    const baseInput = {
        teacher: baseTeacher,
        students: [
            { id: 's-1', groupId: 'g-1', monthlyAmount: 200, enrollmentDate: '2026-01-01', status: 'active' },
            { id: 's-2', groupId: 'g-1', monthlyAmount: 300, enrollmentDate: '2026-01-01', status: 'active' }
        ],
        groups: [{ id: 'g-1', teacherId: 't-1' }],
        allFees: [
            { studentId: 's-1', amount: '200', createdBy: 'أحمد علي' },
            { studentId: 's-2', amount: 300, createdBy: 'أحمد علي' }
        ],
        handovers: [],
        exemptions: [],
        attendanceData: {},
        deductions: [],
        paymentsHistory: [],
        selectedMonthRaw: '2026-05',
        allTeachers: [baseTeacher]
    };

    it('calculates fixed salary correctly without absence', () => {
        const stats = computeTeacherSalaryStats(baseInput);
        expect(stats.expectedExpenses).toBe(500);
        expect(stats.totalCollected).toBe(500);
        expect(stats.basicSalary).toBe(2000);
        expect(stats.attendanceBasedSalary).toBe(2000);
        expect(stats.totalEntitlement).toBe(2000);
    });

    it('handles absence fractions (half, quarter day)', () => {
        const inputWithAbsence = {
            ...baseInput,
            attendanceData: {
                '2026-05-01': 'half',
                '2026-05-02': 'quarter',
                '2026-05-03': 'absent'
            }
        };
        const stats = computeTeacherSalaryStats(inputWithAbsence);
        expect(stats.absentDays).toBe(1.75);
        expect(stats.attendedDays).toBe(stats.totalWorkingDays - 1.75);
    });

    it('handles zero base salary without crashing or defaulting to 1000', () => {
        const teacherZero = { ...baseTeacher, salary: 0 };
        const stats = computeTeacherSalaryStats({ ...baseInput, teacher: teacherZero });
        expect(stats.basicSalary).toBe(0);
        expect(stats.dailyRate).toBe(0);
        expect(stats.totalEntitlement).toBe(0);
    });

    it('calculates partnership accounting correctly', () => {
        const partnershipTeacher = {
            ...baseTeacher,
            accountingType: 'partnership',
            partnershipPercentage: 50,
            salary: 0
        };
        const stats = computeTeacherSalaryStats({ ...baseInput, teacher: partnershipTeacher });
        expect(stats.isPartnership).toBe(true);
        expect(stats.expectedPartnershipSalary).toBe(250); // 50% of 500
    });
});
