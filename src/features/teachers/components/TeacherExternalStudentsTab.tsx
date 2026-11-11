"use client"; // مستحقات محتسبة لهذا المعلم من طلاب انتقلوا بعد ذلك إلى مدرس آخر

import UserMinus from 'lucide-react/dist/esm/icons/user-minus';

export interface ExternalCreditedStudent {
    studentId: string;
    studentName: string;
    currentGroupName: string;
    totalAmount: number;
    months: string[];
}

interface TeacherExternalStudentsTabProps {
    students: ExternalCreditedStudent[];
    monthLabel: string;
}

export const TeacherExternalStudentsTab = ({ students, monthLabel }: TeacherExternalStudentsTabProps) => {
    const totalAmount = students.reduce((sum, s) => sum + s.totalAmount, 0);

    return (
        <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-right space-y-1">
                <p className="text-xs font-bold text-amber-700">
                    دفعات محتسبة لهذا المعلم ({monthLabel}) من طلاب انتقلوا منذ ذلك الحين إلى مجموعة مدرس آخر —
                    يعني الطالب دفع متأخرات شهر كان فيه مع هذا المعلم، لكنه الآن تابع لمدرس مختلف.
                </p>
                {students.length > 0 && (
                    <p className="text-sm font-black text-amber-800">الإجمالي: {totalAmount.toLocaleString()} ج.م</p>
                )}
            </div>

            {students.length === 0 ? (
                <div className="py-10 text-center space-y-2 bg-gray-50/60 rounded-2xl border border-dashed border-gray-200">
                    <UserMinus size={28} className="text-gray-300 mx-auto" />
                    <p className="text-gray-400 text-xs font-bold">لا توجد مستحقات من طلاب سابقين هذا الشهر</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {students.map((s) => (
                        <div key={s.studentId} className="p-4 rounded-2xl border bg-white border-gray-100 shadow-sm text-right space-y-2">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                                <h4 className="font-bold text-gray-800 text-sm">{s.studentName}</h4>
                                <span className="text-sm font-black text-amber-600 font-sans">{s.totalAmount.toLocaleString()} ج.م</span>
                            </div>
                            <p className="text-[11px] text-gray-400 font-bold">
                                انتقل إلى: <span className="text-gray-600">{s.currentGroupName}</span>
                                {s.months.length > 0 && <span> · الأشهر: {s.months.join('، ')}</span>}
                            </p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
