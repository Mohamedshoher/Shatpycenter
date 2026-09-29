import { getErrorMessage } from '@/lib/error-message';

export type AgreementTermScope = 'all' | 'section' | 'teacher';

export interface AgreementTerm {
    id: string;
    orderIndex: number;
    icon: string;
    title: string;
    content: string;
    updatedAt?: string;
    updatedBy?: string;
    scope: AgreementTermScope;
    scopeValue: string | null;
}

export const getAgreementTerms = async (teacherId?: string): Promise<AgreementTerm[]> => {
    try {
        const qs = teacherId ? `?teacherId=${encodeURIComponent(teacherId)}` : '';
        const res = await fetch(`/api/agreement-terms${qs}`);
        if (!res.ok) return [];
        return (await res.json()) || [];
    } catch (error) {
        console.error('Error fetching agreement terms:', getErrorMessage(error));
        return [];
    }
};

export const updateAgreementTerm = async (
    id: string,
    title: string,
    content: string,
    scope: AgreementTermScope,
    options?: { scopeValue?: string; teacherId?: string }
): Promise<void> => {
    const res = await fetch('/api/agreement-terms', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, title, content, scope, scopeValue: options?.scopeValue, teacherId: options?.teacherId }),
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'تعذر حفظ التعديل');
    }
};
