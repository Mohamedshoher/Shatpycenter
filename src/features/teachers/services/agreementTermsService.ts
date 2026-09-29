import { getErrorMessage } from '@/lib/error-message';

export interface AgreementTerm {
    id: string;
    orderIndex: number;
    icon: string;
    title: string;
    content: string;
    updatedAt?: string;
    updatedBy?: string;
}

export const getAgreementTerms = async (): Promise<AgreementTerm[]> => {
    try {
        const res = await fetch('/api/agreement-terms');
        if (!res.ok) return [];
        return (await res.json()) || [];
    } catch (error) {
        console.error('Error fetching agreement terms:', getErrorMessage(error));
        return [];
    }
};

export const updateAgreementTerm = async (id: string, title: string, content: string): Promise<void> => {
    const res = await fetch('/api/agreement-terms', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, title, content }),
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'تعذر حفظ التعديل');
    }
};
