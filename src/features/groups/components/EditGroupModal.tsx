"use client";

import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { updateGroup } from '@/features/groups/services/groupService';
import { getTeachers } from '@/features/teachers/services/teacherService';
import Modal from '@/components/ui/modal';
import Save from 'lucide-react/dist/esm/icons/save'
import X from 'lucide-react/dist/esm/icons/x';

interface EditGroupModalProps {
    isOpen: boolean;
    onClose: () => void;
    group: any | null;
}

export default function EditGroupModal({ isOpen, onClose, group }: EditGroupModalProps) {
    const queryClient = useQueryClient();
    const { data: teachers } = useQuery({ queryKey: ['teachers'], queryFn: () => getTeachers() });

    const activeSortedTeachers = useMemo(() => {
        if (!teachers) return [];
        return teachers
            .filter((t: any) => t.status === 'active')
            .sort((a: any, b: any) => a.fullName.localeCompare(b.fullName, 'ar'));
    }, [teachers]);

    const [editGroupName, setEditGroupName] = useState('');
    const [editTeacherId, setEditTeacherId] = useState('');
    const [editMaxStudentsPerHour, setEditMaxStudentsPerHour] = useState(5);
    const [editHours, setEditHours] = useState(4);

    // المدرس المختار + أقصى ساعات المجموعة المسموح بها (حسب ساعات المدرس اليومية)
    const selectedTeacher = teachers?.find(t => t.id === editTeacherId);
    const maxHours = Number(selectedTeacher?.dailyHours) || 4;

    // تحديث البيانات عند فتح النافذة لمجموعة معينة
    useEffect(() => {
        if (group) {
            setEditGroupName(group.name || '');
            setEditTeacherId(group.teacherId || '');
            setEditMaxStudentsPerHour(group.maxStudentsPerHour || 5);
            setEditHours(Number(group.hours) || 4);
        }
    }, [group]);

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string, data: any }) => updateGroup(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['groups'] });
            onClose(); // إغلاق النافذة عند النجاح
        }
    });

    const handleUpdate = () => {
        if (!group) return;
        const selectedTeacher = teachers?.find((t: any) => t.id === editTeacherId);
        updateMutation.mutate({
            id: group.id,
            data: {
                name: editGroupName,
                teacherId: editTeacherId || null,
                teacher: selectedTeacher?.fullName || 'غير محدد',
                maxStudentsPerHour: Number(editMaxStudentsPerHour) || 5,
                hours: Math.min(editHours || 4, maxHours)
            }
        });
    };

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title="تعديل بيانات المجموعة"
        >
            <div className="p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
                {/* حقل اسم المجموعة */}
                <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-gray-400 pr-1">اسم المجموعة</label>
                    <input
                        type="text"
                        value={editGroupName}
                        onChange={(e) => setEditGroupName(e.target.value)}
                        className="w-full h-11 bg-gray-50 border border-gray-200 rounded-2xl px-4 text-right text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all shadow-inner"
                        placeholder="مثلاً: قرآن 1"
                    />
                </div>

                {/* حقل المدرس المسئول */}
                <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-gray-400 pr-1">المدرس المسئول</label>
                    <select
                        value={editTeacherId}
                        onChange={(e) => {
                            const tid = e.target.value;
                            setEditTeacherId(tid);
                            const t = teachers?.find(x => x.id === tid);
                            const tHours = Number(t?.dailyHours) || 4;
                            setEditHours(prev => Math.min(prev || 4, tHours));
                        }}
                        className="w-full h-11 bg-gray-50 border border-gray-200 rounded-2xl px-4 text-right text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all shadow-inner appearance-none"
                    >
                        <option value="">اختر المدرس المسئول</option>
                        {activeSortedTeachers.map((t: any) => (
                            <option key={t.id} value={t.id}>{t.fullName} {t.dailyHours ? `(${t.dailyHours} ساعات/يوم)` : ''}</option>
                        ))}
                    </select>
                </div>

                {/* حقل عدد ساعات المجموعة (لا يزيد عن ساعات المدرس المسؤول) */}
                <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-gray-400 pr-1">عدد ساعات عمل المجموعة يومياً</label>
                    <div className="relative">
                        <input
                            type="number"
                            min="1"
                            max={maxHours}
                            value={editHours}
                            onChange={(e) => {
                                const v = Number(e.target.value);
                                setEditHours(Math.min(Math.max(v || 0, 1), maxHours));
                            }}
                            className="w-full h-11 bg-gray-50 border border-gray-200 rounded-2xl px-4 text-center text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all shadow-inner"
                        />
                    </div>
                    <p className="text-[10px] font-bold text-indigo-500 pr-1">
                        لا يمكن أن تتجاوز ساعات المجموعة {maxHours} ساعات (حسب ساعات عمل {selectedTeacher?.fullName || 'المدرس المسؤول'})
                    </p>
                </div>

                {/* حقل السعة القصوى */}
                <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-gray-400 pr-1">السعة القصوى (عدد الطلاب في الساعة)</label>
                    <div className="relative">
                        <input
                            type="number"
                            min="1"
                            max="100"
                            value={editMaxStudentsPerHour}
                            onChange={(e) => setEditMaxStudentsPerHour(Number(e.target.value))}
                            className="w-full h-11 bg-gray-50 border border-gray-200 rounded-2xl px-4 text-center text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all shadow-inner"
                        />
                    </div>
                </div>

                {/* أزرار الحفظ والإلغاء */}
                <div className="flex gap-3 pt-4">
                    <button
                        onClick={handleUpdate}
                        disabled={updateMutation.isPending}
                        className="flex-1 h-12 bg-blue-600 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-md active:scale-95 disabled:opacity-50"
                    >
                        <Save size={18} />
                        <span>حفظ التغييرات</span>
                    </button>
                    <button
                        onClick={onClose}
                        className="w-14 h-12 bg-gray-100 text-gray-500 rounded-2xl flex items-center justify-center hover:bg-gray-200 transition-all active:scale-95"
                    >
                        <X size={20} />
                    </button>
                </div>
            </div>
        </Modal>
    );
}
