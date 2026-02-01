import { supabase } from "@/lib/supabase";
import { FinancialTransaction } from "@/types";

// Helper to map DB row to Type
const mapTransaction = (row: any): FinancialTransaction => ({
    id: row.id,
    amount: Number(row.amount),
    type: row.type,
    category: row.category,
    date: row.date,
    description: row.description,
    relatedUserId: row.related_user_id,
    performedBy: row.performed_by,
    timestamp: new Date(row.created_at).getTime()
});

// الحصول على جميع المعاملات المالية
export const getTransactions = async (): Promise<FinancialTransaction[]> => {
    try {
        const { data, error } = await supabase
            .from('financial_transactions')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Supabase error fetching transactions:", error);
            return [];
        }

        return (data || []).map(mapTransaction);
    } catch (error) {
        console.error("خطأ في جلب المعاملات:", error);
        return [];
    }
};

// الحصول على المعاملات حسب الشهر
export const getTransactionsByMonth = async (year: number, month: number): Promise<FinancialTransaction[]> => {
    try {
        // Adjust date filtering logic
        // Assuming we filter by the 'date' field which is YYYY-MM-DD
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        // Calculate end date properly for filtering string dates or timestamp
        // Let's assume we filter by the 'date' column string range
        const nextMonth = month === 12 ? 1 : month + 1;
        const nextYear = month === 12 ? year + 1 : year;
        const endDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;

        const { data, error } = await supabase
            .from('financial_transactions')
            .select('*')
            .gte('date', startDate)
            .lt('date', endDate) // Less than first day of next month
            .order('date', { ascending: false });

        if (error) throw error;
        return (data || []).map(mapTransaction);
    } catch (error) {
        console.error("خطأ في جلب المعاملات الشهرية:", error);
        return [];
    }
};

// الحصول على الإيرادات حسب الشهر
export const getIncomeByMonth = async (year: number, month: number): Promise<FinancialTransaction[]> => {
    try {
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const nextMonth = month === 12 ? 1 : month + 1;
        const nextYear = month === 12 ? year + 1 : year;
        const endDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;

        const { data, error } = await supabase
            .from('financial_transactions')
            .select('*')
            .eq('type', 'income')
            .gte('date', startDate)
            .lt('date', endDate);

        if (error) throw error;
        return (data || []).map(mapTransaction);
    } catch (error) {
        console.error("خطأ في جلب الإيرادات:", error);
        return [];
    }
};

// الحصول على المصروفات حسب الشهر
export const getExpensesByMonth = async (year: number, month: number): Promise<FinancialTransaction[]> => {
    try {
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const nextMonth = month === 12 ? 1 : month + 1;
        const nextYear = month === 12 ? year + 1 : year;
        const endDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;

        const { data, error } = await supabase
            .from('financial_transactions')
            .select('*')
            .eq('type', 'expense')
            .gte('date', startDate)
            .lt('date', endDate);

        if (error) throw error;
        return (data || []).map(mapTransaction);
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
        const transactionData = {
            amount: Number(transaction.amount),
            type: transaction.type,
            category: transaction.category,
            date: transaction.date,
            description: transaction.description,
            related_user_id: transaction.relatedUserId ? String(transaction.relatedUserId).trim() : null,
            performed_by: transaction.performedBy
        };

        console.log('Adding transaction:', transactionData);

        const { data, error } = await supabase
            .from('financial_transactions')
            .insert([transactionData])
            .select('id')
            .single();

        if (error) {
            console.error("Supabase error adding transaction:", {
                message: error.message,
                details: error.details,
                code: error.code
            });
            throw error;
        }

        console.log('Transaction added successfully:', data);
        return data.id;
    } catch (error) {
        console.error("خطأ في إضافة المعاملة:", error);
        return null;
    }
};

// حذف معاملة مالية
export const deleteTransaction = async (transactionId: string): Promise<boolean> => {
    try {
        const { error } = await supabase
            .from('financial_transactions')
            .delete()
            .eq('id', transactionId);

        if (error) throw error;
        return true;
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

        // تحويل teacherId إلى string إذا كان uuid
        const userIdStr = String(teacherId).trim();

        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const nextMonth = month === 12 ? 1 : month + 1;
        const nextYear = month === 12 ? year + 1 : year;
        const endDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;

        console.log('Fetching salary payments for:', { userIdStr, startDate, endDate });

        const { data, error } = await supabase
            .from('financial_transactions')
            .select('*')
            .eq('type', 'expense')
            .eq('category', 'salary')
            .eq('related_user_id', userIdStr)
            .gte('date', startDate)
            .lt('date', endDate)
            .order('date', { ascending: false });

        if (error) {
            console.error("Supabase error fetching salary payments:", {
                message: error.message,
                details: error.details,
                code: error.code,
                hint: error.hint
            });
            return [];
        }

        console.log('Salary payments fetched:', data);
        return (data || []).map(mapTransaction);
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

        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const nextMonth = month === 12 ? 1 : month + 1;
        const nextYear = month === 12 ? year + 1 : year;
        const endDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;

        const { data, error } = await supabase
            .from('financial_transactions')
            .select('*')
            .eq('type', 'income')
            .eq('related_user_id', teacherId)
            .gte('date', startDate)
            .lt('date', endDate);

        if (error) throw error;
        return (data || []).map(mapTransaction);
    } catch (error) {
        console.error("خطأ في جلب تسليمات المدرس:", error);
        return [];
    }
};

// حذف معاملة مالية بالمعايير
export const deleteTransactionByCriteria = async (criteria: { description_like?: string, related_user_id?: string }): Promise<void> => {
    try {
        let query = supabase.from('financial_transactions').delete();
        if (criteria.description_like) {
            query = query.ilike('description', `%${criteria.description_like}%`);
        }
        if (criteria.related_user_id) {
            query = query.eq('related_user_id', criteria.related_user_id);
        }
        await query;
    } catch (error) {
        console.error("Error deleting transaction by criteria:", error);
    }
};
