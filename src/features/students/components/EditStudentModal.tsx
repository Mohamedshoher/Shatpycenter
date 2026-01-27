"use client"; // توجيه لاستخدام المكون في جانب العميل (Client Component)

// استيراد المكتبات والخطافات (Hooks) اللازمة
import { useState, useEffect } from 'react';
import Modal from '@/components/ui/modal'; // مكون النافذة المنبثقة العام
import { Input } from '@/components/ui/input'; // مكون حقل الإدخال
import { Button } from '@/components/ui/button'; // مكون الزر
import { updateStudent } from '../services/studentService'; // خدمة تحديث بيانات الطالب في قاعدة البيانات
import { Loader2 } from 'lucide-react'; // أيقونة التحميل
import { Student, Group } from '@/types'; // استيراد نوع بيانات الطالب
import { getGroups } from '@/features/groups/services/groupService';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'; // مكتبة إدارة حالات البيانات (TanStack Query)

// تعريف أنواع الخصائص (Props) التي يستقبلها المكون
interface EditStudentModalProps {
    student: Student | null; // بيانات الطالب الحالي المراد تعديله
    isOpen: boolean; // حالة فتح النافذة
    onClose: () => void; // دالة لإغلاق النافذة
}

export default function EditStudentModal({ student, isOpen, onClose }: EditStudentModalProps) {
    const queryClient = useQueryClient(); // الوصول إلى عميل الاستعلامات لتحديث البيانات بعد التعديل

    // حالة بيانات النموذج (Form State)
    const [formData, setFormData] = useState({
        fullName: '',
        parentPhone: '',
        isOrphan: false,
        enrollmentDate: '',
        status: 'active' as Student['status'],
        groupId: '',
        monthlyAmount: 80,
        appointment: '',
    });

    const { data: groups } = useQuery({
        queryKey: ['groups'],
        queryFn: getGroups
    });

    // مراقبة التغيير في الطالب المختار لتعبئة النموذج ببياناته تلقائياً عند الفتح
    useEffect(() => {
        if (student) {
            setFormData({
                fullName: student.fullName || '',
                parentPhone: student.parentPhone || '',
                isOrphan: student.isOrphan || false,
                enrollmentDate: student.enrollmentDate || '',
                status: student.status || 'active',
                groupId: student.groupId || '',
                monthlyAmount: student.monthlyAmount || 80,
                appointment: student.appointment || '',
            });
        }
    }, [student]);

    // إعداد عملية التعديل باستخدام useMutation
    const mutation = useMutation({
        mutationFn: (updatedData: Partial<Student>) => {
            if (!student?.id) throw new Error('Student ID is missing');
            return updateStudent(student.id, updatedData); // استدعاء خدمة التعديل
        },
        onSuccess: () => {
            // عند النجاح: تحديث الكاش لإظهار البيانات الجديدة في القائمة فوراً
            queryClient.invalidateQueries({ queryKey: ['students'] });
            onClose(); // إغلاق النافذة
        },
    });

    // دالة معالجة إرسال النموذج
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        mutation.mutate(formData as any); // تنفيذ عملية التعديل
    };

    // في حال عدم وجود طالب مختار، لا يتم عرض أي شيء
    if (!student) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="تعديل بيانات الطالب" className="max-w-4xl h-[95vh] md:h-auto">
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* شبكة حقول الإدخال (Grid) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* حقل الاسم الكامل */}
                    <Input
                        label="الاسم الرباعي"
                        placeholder="أدخل اسم الطالب بالكامل"
                        value={formData.fullName}
                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                        required
                    />
                    {/* حقل رقم الهاتف */}
                    <Input
                        label="رقم هاتف ولي الأمر"
                        type="tel"
                        placeholder="0123456789"
                        value={formData.parentPhone}
                        onChange={(e) => setFormData({ ...formData, parentPhone: e.target.value })}
                        required
                        dir="ltr"
                    />
                    <div className="flex items-center justify-between bg-orange-50/50 border border-orange-100 p-4 rounded-xl h-12">
                        <label className="text-sm font-bold text-gray-700">هل الطالب يتيم؟</label>
                        <input
                            type="checkbox"
                            checked={formData.isOrphan}
                            onChange={(e) => setFormData({ ...formData, isOrphan: e.target.checked })}
                            className="w-5 h-5 rounded-md border-gray-300 text-purple-600 focus:ring-purple-500"
                        />
                    </div>
                    {/* حقل تاريخ الالتحاق */}
                    <Input
                        label="تاريخ الالتحاق"
                        type="date"
                        value={formData.enrollmentDate}
                        onChange={(e) => setFormData({ ...formData, enrollmentDate: e.target.value })}
                        required
                        dir="rtl"
                    />
                    <Input
                        label="المبلغ الشهري"
                        type="number"
                        placeholder="0.00"
                        value={formData.monthlyAmount || ''}
                        onChange={(e) => setFormData({ ...formData, monthlyAmount: Number(e.target.value) })}
                        required
                        dir="ltr"
                    />
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-gray-700 mr-1">المجموعة</label>
                        <select
                            value={formData.groupId || ''}
                            onChange={(e) => setFormData({ ...formData, groupId: e.target.value })}
                            className="w-full h-12 bg-white border border-gray-100 rounded-xl px-4 text-right font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/10 shadow-sm appearance-none"
                            style={{ backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%239ca3af%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'left 1rem center', backgroundSize: '1em' }}
                            required
                        >
                            <option value="">اختر المجموعة</option>
                            {groups?.map((group: Group) => (
                                <option key={group.id} value={group.id}>{group.name}</option>
                            ))}
                        </select>
                    </div>
                    <Input
                        label="موعد الحضور"
                        placeholder="مثال: السبت والأربعاء الساعة ٤ عصراً"
                        value={(formData as any).appointment || ''}
                        onChange={(e) => setFormData({ ...formData, appointment: e.target.value } as any)}
                    />
                </div>

                {/* أزرار التحكم في أسفل النموذج */}
                <div className="flex items-center gap-3 pt-4 justify-start">
                    {/* زر حفظ التعديلات مع حالة التحميل */}
                    <Button type="submit" disabled={mutation.isPending} className="px-8 bg-blue-600 hover:bg-blue-700">
                        {mutation.isPending ? (
                            <div className="flex items-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>جاري الحفظ...</span>
                            </div>
                        ) : "حفظ التعديلات"}
                    </Button>
                    {/* زر الإلغاء */}
                    <Button type="button" variant="secondary" onClick={onClose}>
                        إلغاء
                    </Button>
                </div>
            </form>
        </Modal>
    );
}