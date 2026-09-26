import { describe, it, expect } from 'vitest';

/**
 * دالة مساعدة لاختبار التحقق من صحة مدخلات الهاتف ومفتاح الشهر
 */
export const validateLoginInput = (identifier: string): { isValid: boolean; role: string } => {
    if (!identifier || typeof identifier !== 'string') {
        return { isValid: false, role: 'invalid' };
    }
    const clean = identifier.trim();

    // فحص محاولات حقن أو محارف غريبة
    if (/[<>'";=]/.test(clean)) {
        return { isValid: false, role: 'invalid' };
    }

    if (clean === 'director' || clean === 'supervisor') {
        return { isValid: true, role: clean };
    }

    if (clean.startsWith('teacher-') || clean.startsWith('supervisor-') || clean.startsWith('secretary-')) {
        return { isValid: true, role: clean.split('-')[0] };
    }

    if (/^\d{10,14}$/.test(clean)) {
        return { isValid: true, role: 'parent' };
    }

    return { isValid: false, role: 'invalid' };
};

export const validateMonthKey = (monthKey: string): boolean => {
    if (!monthKey || typeof monthKey !== 'string') return false;
    return /^\d{4}-(0[1-9]|1[0-2])$/.test(monthKey.trim());
};

describe('Login Input & MonthKey Validation', () => {
    it('validates correct login roles and identifiers', () => {
        expect(validateLoginInput('director')).toEqual({ isValid: true, role: 'director' });
        expect(validateLoginInput('01012345678')).toEqual({ isValid: true, role: 'parent' });
        expect(validateLoginInput('teacher-uuid-123')).toEqual({ isValid: true, role: 'teacher' });
    });

    it('rejects malicious injection attempts in identifier', () => {
        expect(validateLoginInput("<script>alert('xss')</script>")).toEqual({ isValid: false, role: 'invalid' });
        expect(validateLoginInput("director' OR '1'='1")).toEqual({ isValid: false, role: 'invalid' });
        expect(validateLoginInput('teacher-123; DROP TABLE users;')).toEqual({ isValid: false, role: 'invalid' });
    });

    it('validates monthKey YYYY-MM boundaries correctly', () => {
        expect(validateMonthKey('2026-05')).toBe(true);
        expect(validateMonthKey('2026-12')).toBe(true);
        expect(validateMonthKey('2026-13')).toBe(false);
        expect(validateMonthKey('2026-00')).toBe(false);
        expect(validateMonthKey("2026-05' OR 1=1")).toBe(false);
    });
});
