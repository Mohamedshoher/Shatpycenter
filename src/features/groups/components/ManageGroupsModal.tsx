"use client";

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getGroups, updateGroup, deleteGroup } from '@/features/groups/services/groupService';
import { getTeachers } from '@/features/teachers/services/teacherService';
import { getStudents } from '@/features/students/services/studentService';
import Modal from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Trash2, User, Save, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ManageGroupsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function ManageGroupsModal({ isOpen, onClose }: ManageGroupsModalProps) {
    const queryClient = useQueryClient();
    const { data: groups } = useQuery({ queryKey: ['groups'], queryFn: getGroups });
    const { data: teachers } = useQuery({ queryKey: ['teachers'], queryFn: getTeachers });
    const { data: students } = useQuery({ queryKey: ['students'], queryFn: getStudents });

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editTeacherId, setEditTeacherId] = useState('');

    // تحسين بيانات المجموعات
    const enhancedGroups = useMemo(() => {
        if (!groups) return [];

        return groups.map(group => {
            const teacher = teachers?.find(t => t.id === group.teacherId);
            const studentCount = students?.filter(s => s.groupId === group.id && s.status === 'active').length || 0;

            let color = 'bg-gray-100 text-gray-600';
            if (group.name.includes('قرآن')) color = 'bg-blue-100 text-blue-600';
            else if (group.name.includes('تلقين')) color = 'bg-green-100 text-green-600';
            else if (group.name.includes('نور بيان')) color = 'bg-orange-100 text-orange-600';
            else if (group.name.includes('إقراء')) color = 'bg-red-100 text-red-600';

            return {
                ...group,
                teacher: teacher?.fullName || 'غير محدد',
                count: studentCount,
                color
            };
        });
    }, [groups, teachers, students]);

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string, data: any }) => updateGroup(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['groups'] });
            setEditingId(null);
        }
    });

    const deleteMutation = useMutation({
        mutationFn: deleteGroup,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['groups'] });
        }
    });

    const handleDelete = (id: string, count: number) => {
        if (count > 0) {
            alert('لا يمكن حذف مجموعة تحتوي على طلاب. يرجى نقل الطلاب أولاً.');
            return;
        }
        if (confirm('هل أنت متأكد من حذف هذه المجموعة؟')) {
            deleteMutation.mutate(id);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="إدارة المجموعات">
            <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto no-scrollbar">
                {enhancedGroups?.map((group) => (
                    <div key={group.id} className="bg-gray-50 rounded-2xl p-4 border border-gray-100 space-y-3">
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
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>

                        {editingId === group.id ? (
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
                                <button
                                    onClick={() => {
                                        const selectedTeacher = teachers?.find(t => t.id === editTeacherId);
                                        updateMutation.mutate({
                                            id: group.id,
                                            data: {
                                                teacherId: editTeacherId || null,
                                                teacher: selectedTeacher?.fullName || 'غير محدد'
                                            }
                                        });
                                    }}
                                    className="w-10 h-10 bg-green-500 text-white rounded-xl flex items-center justify-center hover:bg-green-600 transition-colors shadow-sm"
                                >
                                    <Save size={18} />
                                </button>
                                <button
                                    onClick={() => setEditingId(null)}
                                    className="w-10 h-10 bg-gray-100 text-gray-500 rounded-xl flex items-center justify-center hover:bg-gray-200 transition-colors"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center justify-between bg-white rounded-xl p-3 border border-gray-100">
                                <div className="flex items-center gap-2 text-gray-500">
                                    <User size={14} />
                                    <span className="text-xs font-bold">{group.teacher}</span>
                                </div>
                                <button
                                    onClick={() => {
                                        setEditingId(group.id);
                                        setEditTeacherId(group.teacherId || '');
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
