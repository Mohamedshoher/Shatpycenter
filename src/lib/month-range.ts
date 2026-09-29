// حساب حدود شهر (YYYY-MM) كسلاسل تواريخ YYYY-MM-DD، والشهر السابق له
export const getMonthRange = (monthKey: string): { start: string; end: string } => {
    const [year, month] = monthKey.split('-').map(Number);
    const lastDay = new Date(year, month, 0).getDate();
    return { start: `${monthKey}-01`, end: `${monthKey}-${String(lastDay).padStart(2, '0')}` };
};

export const getPreviousMonthKey = (monthKey: string): string => {
    const [year, month] = monthKey.split('-').map(Number);
    const d = new Date(year, month - 2, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};
