"use client";

// --- الاستيرادات (Imports) ---
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getGroups, updateGroup, deleteGroup } from '@/features/groups/services/groupService';
import { getTeachers } from '@/features/teachers/services/teacherService';
import { getStudents } from '@/features/students/services/studentService';
import Modal from '@/components/ui/modal';
import { Trash2, User, Save, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/useAuthStore';

// --- واجهات الاستخدام (Interfaces) ---
interface ManageGroupsModalProps {
    isOpen: boolean;       // حالة فتح/إغلاق النافذة
    onClose: () => void;   // دالة الإغلاق
}

// دالة مساعدة لتحديد لون المجموعة بناءً على اسمها
const getGroupColor = (name: string) => {
    if (name.includes('قرآن')) return 'bg-blue-100 text-blue-600';
    if (name.includes('تلقين')) return 'bg-green-100 text-green-600';
    if (name.includes('نور بيان')) return 'bg-orange-100 text-orange-600';
    if (name.includes('إقراء')) return 'bg-red-100 text-red-600';
    return 'bg-gray-100 text-gray-600'; // اللون الافتراضي
};

// --- المكون الأساسي (Main Component) ---
export default function ManageGroupsModal({ isOpen, onClose }: ManageGroupsModalProps) {
    const queryClient = useQueryClient();

    // 1. جلب البيانات الأساسية باستخدام React Query
    const { data: groups } = useQuery({ queryKey: ['groups'], queryFn: getGroups });
    const { data: teachers } = useQuery({ queryKey: ['teachers'], queryFn: getTeachers });
    const { data: students } = useQuery({ queryKey: ['students'], queryFn: getStudents });

    // 2. إدارة حالة واجهة المستخدم (State)
    const [editingId, setEditingId] = useState<string | null>(null); // الـ ID للمجموعة التي يتم تعديلها حالياً
    const [editTeacherId, setEditTeacherId] = useState('');          // الـ ID للمدرس المختار أثناء التعديل

    // 3. تحسين وتصفية بيانات المجموعات (Memoized Data)
    // يتم إعادة حساب هذه البيانات فقط إذا تغيرت (المجموعات، المدرسين، الطلاب)
    const enhancedGroups = useMemo(() => {
        if (!groups) return [];

        const user = useAuthStore.getState().user; // جلب بيانات المستخدم الحالي (لصلاحيات المشرف)
        let filtered = groups;

        // إذا كان المستخدم مشرفاً، نعرض له فقط المجموعات التابعة للأقسام المسؤولة عنه
        if (user?.role === 'supervisor') {
            const sections = user.responsibleSections || [];
            if (sections.length > 0) {
                filtered = groups.filter(group => sections.some(section => group.name.includes(section)));
            }
        }

        // دمج البيانات: إضافة اسم المدرس، عدد الطلاب النشطين، واللون المخصص لكل مجموعة
        return filtered.map(group => {
            const teacher = teachers?.find(t => t.id === group.teacherId);
            const studentCount = students?.filter(s => s.groupId === group.id && s.status === 'active').length || 0;

            return {
                ...group,
                teacher: teacher?.fullName || 'غير محدد',
                count: studentCount,
                color: getGroupColor(group.name)
            };
        });
    }, [groups, teachers, students]);

    // 4. العمليات (Mutations)
    // أ. عملية تحديث المجموعة (تغيير المدرس)
    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string, data: any }) => updateGroup(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['groups'] }); // تحديث القائمة
            setEditingId(null); // إغلاق وضع التعديل
        }
    });

    // ب. عملية حذف المجموعة
    const deleteMutation = useMutation({
        mutationFn: deleteGroup,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['groups'] });
        }
    });

    // 5. دوال معالجة الأحداث (Event Handlers)
    // معالجة حدث الحذف مع التحقق من وجود طلاب
    const handleDelete = (id: string, count: number) => {
        if (count > 0) {
            alert('لا يمكن حذف مجموعة تحتوي على طلاب. يرجى نقل الطلاب أولاً.');
            return;
        }
        if (confirm('هل أنت متأكد من حذف هذه المجموعة؟')) {
            deleteMutation.mutate(id);
        }
    };

    // معالجة حدث حفظ تغيير المدرس
    const handleUpdateTeacher = (groupId: string) => {
        const selectedTeacher = teachers?.find(t => t.id === editTeacherId);
        updateMutation.mutate({
            id: groupId,
            data: {
                teacherId: editTeacherId || null,
                teacher: selectedTeacher?.fullName || 'غير محدد'
            }
        });
    };

    // --- واجهة المستخدم (UI / JSX) ---
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="إدارة المجموعات">
            
            {/* --- قائمة المجموعات --- */}
            <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto no-scrollbar">
                {enhancedGroups?.map((group) => (
                    <div key={group.id} className="bg-gray-50 rounded-2xl p-4 border border-gray-100 space-y-3">
                        
                        {/* ترويسة المجموعة: الاسم، عدد الطلاب، وزر الحذف */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold", group.color)}>
                                    {group.count} طلاب
                                </span>
                                <h3 className="font-bold text-gray-900">{group.name}</h3>
                            </div>
                            <button
                                onClick={() => handleDelete(group.id, group.count)}
                                className="text-gray-400 hover:text-red-500 transition-colors p-1"
                                title="حذف المجموعة"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>

                        {/* قسم التعديل: يظهر إذا كانت المجموعة في وضع التعديل، وإلا يظهر عرض البيانات العادي */}
                        {editingId === group.id ? (
                            
                            // --- وضع التعديل (اختيار مدرس جديد) ---
                            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2">
                                <select
                                    value={editTeacherId}
                                    onChange={(e) => setEditTeacherId(e.target.value)}
                                    className="flex-1 h-10 bg-white border border-gray-200 rounded-xl px-3 text-right text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/10"
                                >
                                    <option value="">اختر مدرساً</option>
                                    {teachers?.map((t) => (
                                        <option key={t.id} value={t.id}>{t.fullName}</option>
                                    ))}
                                </select>
                                
                                {/* زر الحفظ */}
                                <button
                                    onClick={() => handleUpdateTeacher(group.id)}
                                    disabled={updateMutation.isPending}
                                    className="w-10 h-10 bg-green-500 text-white rounded-xl flex items-center justify-center hover:bg-green-600 transition-colors shadow-sm disabled:opacity-50"
                                >
                                    <Save size={18} />
                                </button>
                                
                                {/* زر الإلغاء */}
                                <button
                                    onClick={() => setEditingId(null)}
                                    className="w-10 h-10 bg-gray-100 text-gray-500 rounded-xl flex items-center justify-center hover:bg-gray-200 transition-colors"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        ) : (
                            
                            // --- وضع العرض (اسم المدرس وزر تغيير المدرس) ---
                            <div className="flex items-center justify-between bg-white rounded-xl p-3 border border-gray-100">
                                <div className="flex items-center gap-2 text-gray-500">
                                    <User size={14} />
                                    <span className="text-xs font-bold">{group.teacher}</span>
                                </div>
                                <button
                                    onClick={() => {
                                        setEditingId(group.id);
                                        setEditTeacherId(group.teacherId || ''); // وضع الـ ID الحالي
                                    }}
                                    className="text-blue-600 text-xs font-black hover:underline"
                                >
                                    تغيير المدرس
                                </button>
                            </div>
                        )}
                    </div>
                ))}
            </div>
            <div className="p-4 bg-gray-50 border-t border-gray-100 rounded-b-3xl">
                <p className="text-[10px] text-gray-400 font-bold text-center">
                    * لا يمكن حذف المجموعات التي تحتوي على طلاب (العدد أكبر من 0)
                </p>
            </div>
        </Modal>
    );
}