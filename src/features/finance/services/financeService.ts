import { FinancialTransaction } from "@/types";

// الحصول على جميع المعاملات المالية
export const getTransactions = async (): Promise<FinancialTransaction[]> => {
    try {
        const res = await fetch('/api/finance');
        if (!res.ok) return [];
        return await res.json();
    } catch (error) {
        console.error("خطأ في جلب المعاملات:", error);
        return [];
    }
};

// الحصول على المعاملات حسب الشهر
export const getTransactionsByMonth = async (year: number, month: number): Promise<FinancialTransaction[]> => {
    try {
        const res = await fetch(`/api/finance?year=${year}&month=${month}`);
        if (!res.ok) return [];
        return await res.json();
    } catch (error) {
        console.error("خطأ في جلب المعاملات الشهرية:", error);
        return [];
    }
};

// الحصول على الإيرادات حسب الشهر
export const getIncomeByMonth = async (year: number, month: number): Promise<FinancialTransaction[]> => {
    try {
        const res = await fetch(`/api/finance?year=${year}&month=${month}&type=income`);
        if (!res.ok) return [];
        return await res.json();
    } catch (error) {
        console.error("خطأ في جلب الإيرادات:", error);
        return [];
    }
};

// الحصول على المصروفات حسب الشهر
export const getExpensesByMonth = async (year: number, month: number): Promise<FinancialTransaction[]> => {
    try {
        const res = await fetch(`/api/finance?year=${year}&month=${month}&type=expense`);
        if (!res.ok) return [];
        return await res.json();
    } catch (error) {
        console.error("خطأ في جلب المصروفات:", error);
        return [];
    }
};

// إضافة معاملة مالية جديدة
export const addTransaction = async (
    transaction: Omit<FinancialTransaction, 'id' | 'timestamp'>
): Promise<string | null> => {
    try {
        const res = await fetch('/api/finance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(transaction),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            console.error("API error adding transaction:", data.error);
            return null;
        }
        return data.id;
    } catch (error) {
        console.error("خطأ في إضافة المعاملة:", error);
        return null;
    }
};

// حذف معاملة مالية
export const deleteTransaction = async (transactionId: string): Promise<boolean> => {
    try {
        const res = await fetch(`/api/finance?id=${encodeURIComponent(transactionId)}`, { method: 'DELETE' });
        return res.ok;
    } catch (error) {
        console.error("خطأ في حذف المعاملة:", error);
        return false;
    }
};

// الحصول على سجل صرف الرواتب للمدرس في شهر معين
export const getTeacherSalaryPayments = async (
    teacherId: string,
    year: number,
    month: number
): Promise<FinancialTransaction[]> => {
    try {
        if (!teacherId) {
            console.warn("teacherId is required");
            return [];
        }
        const res = await fetch(`/api/finance?year=${year}&month=${month}&type=expense&category=salary&teacherId=${encodeURIComponent(teacherId)}`);
        if (!res.ok) return [];
        return await res.json();
    } catch (error) {
        console.error("خطأ في جلب سجل الرواتب:", error);
        return [];
    }
};

// حساب إجمالي الإيرادات والمصروفات
export const getFinancialSummary = async (year: number, month: number) => {
    try {
        // Optimization: Could use RPC or aggregation query, but reusing functions is safer for now
        const income = await getIncomeByMonth(year, month);
        const expenses = await getExpensesByMonth(year, month);

        const totalIncome = income.reduce((sum, tr) => sum + tr.amount, 0);
        const totalExpenses = expenses.reduce((sum, tr) => sum + tr.amount, 0);

        return {
            totalIncome,
            totalExpenses,
            balance: totalIncome - totalExpenses,
            incomeCount: income.length,
            expenseCount: expenses.length
        };
    } catch (error) {
        console.error("خطأ في حساب الملخص المالي:", error);
        return {
            totalIncome: 0,
            totalExpenses: 0,
            balance: 0,
            incomeCount: 0,
            expenseCount: 0
        };
    }
};

// الحصول على سجل المبالغ المستلمة من مدرس معين
export const getTeacherHandovers = async (teacherId: string, monthKey: string): Promise<FinancialTransaction[]> => {
    try {
        const [yearStr, monthStr] = monthKey.split('-');
        const year = parseInt(yearStr);
        const month = parseInt(monthStr);
        const res = await fetch(`/api/finance?year=${year}&month=${month}&type=income&teacherId=${encodeURIComponent(teacherId)}`);
        if (!res.ok) return [];
        return await res.json();
    } catch (error) {
        console.error("خطأ في جلب تسليمات المدرس:", error);
        return [];
    }
};

// حذف معاملة مالية بالمعايير
export const deleteTransactionByCriteria = async (criteria: { description_like?: string, related_user_id?: string }): Promise<void> => {
    try {
        const params = new URLSearchParams();
        if (criteria.description_like) params.set('descriptionLike', criteria.description_like);
        if (criteria.related_user_id) params.set('relatedUserId', criteria.related_user_id);
        await fetch(`/api/finance?${params.toString()}`, { method: 'DELETE' });
    } catch (error) {
        console.error("Error deleting transaction by criteria:", error);
    }
};
