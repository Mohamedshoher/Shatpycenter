import { describe, it, expect } from 'vitest';
import { calculateContinuousAbsence, calculateTotalAbsence } from '../attendance-utils';

describe('calculateContinuousAbsence', () => {
    it('returns 0 for empty attendance', () => {
        expect(calculateContinuousAbsence([])).toBe(0);
    });

    it('calculates continuous absence correctly from recent days', () => {
        const attendance = [
            { month: '2026-05', day: 10, status: 'absent' },
            { month: '2026-05', day: 11, status: 'absent' },
            { month: '2026-05', day: 12, status: 'absent' },
            { month: '2026-05', day: 9, status: 'present' }
        ];
        expect(calculateContinuousAbsence(attendance)).toBe(3);
    });

    it('stops counting continuous absence when a present day is encountered', () => {
        const attendance = [
            { month: '2026-05', day: 12, status: 'absent' },
            { month: '2026-05', day: 11, status: 'present' },
            { month: '2026-05', day: 10, status: 'absent' }
        ];
        expect(calculateContinuousAbsence(attendance)).toBe(1);
    });
});

describe('calculateTotalAbsence', () => {
    it('counts total absent days for a specific month', () => {
        const attendance = [
            { month: '2026-05', day: 1, status: 'absent' },
            { month: '2026-05', day: 2, status: 'present' },
            { month: '2026-05', day: 3, status: 'absent' },
            { month: '2026-06', day: 1, status: 'absent' }
        ];
        expect(calculateTotalAbsence(attendance, '2026-05')).toBe(2);
    });
});
