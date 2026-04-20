"use client"; // توجيه Next.js بأن هذا المكون يعمل على جهة العميل (Client-Side)

// --- الاستيرادات (Imports) ---
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTeachers } from '@/features/teachers/services/teacherService';
import { addGroup } from '@/features/groups/services/groupService';
import Modal from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// --- الثوابت (Constants) ---
// تحديد ألوان كل نوع من أنواع المجموعات لسهولة الاستخدام والتعديل مستقبلاً
const GROUP_COLORS = {
    'قرآن': 'bg-blue-100 text-blue-600',
    'تلقين': 'bg-green-100 text-green-600',
    'نور بيان': 'bg-orange-100 text-orange-600',
    'إقراء': 'bg-red-100 text-red-600'
} as const;

// استخراج أنواع المجموعات من كائن الألوان
const GROUP_TYPES = Object.keys(GROUP_COLORS) as Array<keyof typeof GROUP_COLORS>;

// --- واجهات الاستخدام (Interfaces) ---
interface AddGroupModalProps {
    isOpen: boolean;       // حالة فتح/إغلاق النافذة المنبثقة
    onClose: () => void;   // دالة إغلاق النافذة المنبثقة
}

// --- المكون الأساسي (Main Component) ---
export default function AddGroupModal({ isOpen, onClose }: AddGroupModalProps) {
    const queryClient = useQueryClient();

    // 1. جلب بيانات المدرسين باستخدام React Query
    const { data: teachers } = useQuery({
        queryKey: ['teachers'],
        queryFn: getTeachers
    });

    // 2. إدارة حالة البيانات داخل النموذج (State Management)
    const [name, setName] = useState('');
    const [teacherId, setTeacherId] = useState('');
    const [type, setType] = useState<keyof typeof GROUP_COLORS>('قرآن');
    const [maxStudentsPerHour, setMaxStudentsPerHour] = useState(5);

    // 3. إعداد عملية الإضافة (Mutation) لإرسال البيانات للخادم
    const addMutation = useMutation({
        mutationFn: addGroup,
        onSuccess: () => {
            // تحديث قائمة المجموعات تلقائياً بعد الإضافة الناجحة
            queryClient.invalidateQueries({ queryKey: ['groups'] });
            
            // إعادة تعيين الحقول وإغلاق النافذة
            onClose();
            setName('');
            setTeacherId('');
        }
    });

    // 4. معالجة حدث إرسال النموذج (Form Submit Handler)
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault(); // منع إعادة تحميل الصفحة الافتراضي
        
        // البحث عن المدرس المختار بناءً على الـ ID الخاص به
        const selectedTeacher = teachers?.find(t => t.id === teacherId);
        
        // تنفيذ طلب الإضافة وإرسال البيانات المجمعة
        addMutation.mutate({
            name: `${type} (${name})`,
            teacherId: selectedTeacher?.id || null,
            teacher: selectedTeacher?.fullName || '',
            schedule: '',
            count: 0,
            color: GROUP_COLORS[type] || 'bg-gray-100 text-gray-600',
            maxStudentsPerHour: maxStudentsPerHour || 5
        });
    };

    // --- واجهة المستخدم (UI / JSX) ---
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="إضافة مجموعة جديدة">
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                
                {/* --- حقل: نوع المجموعة --- */}
                <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-600 block">نوع المجموعة</label>
                    <div className="grid grid-cols-2 gap-2">
                        {GROUP_TYPES.map((t) => (
                            <button
                                key={t}
                                type="button"
                                onClick={() => setType(t)}
                                className={cn(
                                    "py-2 rounded-xl text-xs font-bold border transition-all",
                                    type === t 
                                        ? "bg-purple-600 text-white border-purple-600" // التنسيق عند التحديد
                                        : "bg-white text-gray-500 border-gray-100 hover:border-purple-200" // التنسيق العادي
                                )}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                </div>

                {/* --- حقل: اسم/رقم المجموعة --- */}
                <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-600 block">اسم/رقم المجموعة</label>
                    <input
                        required
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="مثال: 1 أو أ"
                        className="w-full h-12 bg-gray-50 border border-gray-100 rounded-xl px-4 text-right font-bold focus:outline-none focus:ring-2 focus:ring-purple-500/10"
                    />
                </div>

                {/* --- حقل: اختيار المدرس --- */}
                <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-600 block">المدرس المسؤول</label>
                    <select
                        required
                        value={teacherId} // نستخدم الـ ID كقيمة
                        onChange={(e) => setTeacherId(e.target.value)}
                        className="w-full h-12 bg-gray-50 border border-gray-100 rounded-xl px-4 text-right font-bold focus:outline-none focus:ring-2 focus:ring-purple-500/10"
                    >
                        <option value="">اختر مدرساً</option>
                        {teachers?.map((t) => (
                            <option key={t.id} value={t.id}> 
                                {t.fullName}
                            </option>
                        ))}
                    </select>
                </div>

                {/* --- حقل: أقصى عدد طلاب في الساعة --- */}
                <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-600 block">أقصى عدد طلاب في الساعة</label>
                    <div className="flex items-center gap-3">
                        <input
                            type="number"
                            min="1"
                            max="30"
                            value={maxStudentsPerHour}
                            onChange={(e) => setMaxStudentsPerHour(Number(e.target.value))}
                            className="w-24 h-12 bg-gray-50 border border-gray-100 rounded-xl px-4 text-center font-black text-lg focus:outline-none focus:ring-2 focus:ring-purple-500/10"
                        />
                        <p className="text-xs text-gray-400 font-bold">لا يمكن للمدرس تجديد موعد طالب في ساعة تجاوز هذا العدد</p>
                    </div>
                </div>

                {/* --- زر الإرسال والحفظ --- */}
                <div className="pt-4">
                    <Button
                        type="submit"
                        className="w-full h-12 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold shadow-lg shadow-purple-500/20"
                        disabled={addMutation.isPending} // تعطيل الزر أثناء رفع البيانات
                    >
                        {addMutation.isPending ? 'جاري الإضافة...' : 'إضافة المجموعة'}
                    </Button>
                </div>
                
            </form>
        </Modal>
    );
}