"use client";

// --- الاستيرادات (Imports) ---
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getGroups, updateGroup, deleteGroup } from '@/features/groups/services/groupService';
import { getTeachers } from '@/features/teachers/services/teacherService';
import { getStudents } from '@/features/students/services/studentService';
import Modal from '@/components/ui/modal';
import { Trash2, User, X, Edit2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/useAuthStore';
import EditGroupModal from './EditGroupModal';

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

    const [selectedGroupToEdit, setSelectedGroupToEdit] = useState<any | null>(null);

    // 3. تحسين وتصفية بيانات المجموعات (Memoized Data)
    const enhancedGroups = useMemo(() => {
        if (!groups) return [];

        const user = useAuthStore.getState().user;
        let filtered = groups;

        if (user?.role === 'supervisor') {
            const sections = user.responsibleSections || [];
            if (sections.length > 0) {
                filtered = groups.filter(group => sections.some(section => group.name.includes(section)));
            }
        }

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

    // --- واجهة المستخدم (UI / JSX) ---
    return (
        <>
            <Modal isOpen={isOpen} onClose={onClose} title="إدارة المجموعات">
                
                {/* --- قائمة المجموعات --- */}
                <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto no-scrollbar">
                    {enhancedGroups?.map((group) => (
                        <div key={group.id} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-all">
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0", group.color)}>
                                            {group.count} طلاب
                                        </span>
                                        <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-0.5 border border-gray-100">
                                            <button
                                                onClick={() => handleDelete(group.id, group.count)}
                                                className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                                                title="حذف"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => setSelectedGroupToEdit(group)}
                                                className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-md transition-colors"
                                                title="تعديل"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                    <h3 className="font-bold text-gray-900 text-lg">{group.name}</h3>
                                </div>

                                <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                                    <div className="flex items-center gap-1.5 bg-blue-50 text-blue-600 px-3 py-1 rounded-lg border border-blue-100">
                                        <span className="text-[10px] font-black text-blue-400">سعة الساعة:</span>
                                        <span className="text-[11px] font-bold">{group.maxStudentsPerHour || 5}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-gray-500">
                                        <span className="text-sm font-bold">{group.teacher}</span>
                                        <User size={14} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="p-4 bg-gray-50 border-t border-gray-100 rounded-b-3xl text-center">
                    <p className="text-[10px] text-gray-400 font-bold">
                        * لإضافة مجموعة جديدة، استخدم زر الإضافة الرئيسي في اللوحة
                    </p>
                </div>
            </Modal>

            {/* --- نافذة تعديل المجموعة (البوب أب) --- */}
            <EditGroupModal
                isOpen={!!selectedGroupToEdit}
                onClose={() => setSelectedGroupToEdit(null)}
                group={selectedGroupToEdit}
            />
        </>
    );
}