"use client";

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTeachers } from '@/features/teachers/services/teacherService';
import { addGroup, updateGroup, deleteGroup } from '@/features/groups/services/groupService';
import Modal from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, User, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AddGroupModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function AddGroupModal({ isOpen, onClose }: AddGroupModalProps) {
    const queryClient = useQueryClient();
    const { data: teachers } = useQuery({
        queryKey: ['teachers'],
        queryFn: getTeachers
    });

    const [name, setName] = useState('');
    const [teacher, setTeacher] = useState('');
    const [type, setType] = useState('قرآن');

    const addMutation = useMutation({
        mutationFn: addGroup,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['groups'] });
            onClose();
            setName('');
            setTeacher('');
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const selectedTeacher = teachers?.find(t => t.fullName === teacher);
        const colors = {
            'قرآن': 'bg-blue-100 text-blue-600',
            'تلقين': 'bg-green-100 text-green-600',
            'نور بيان': 'bg-orange-100 text-orange-600',
            'إقراء': 'bg-red-100 text-red-600'
        };
        addMutation.mutate({
            name: `${type} (${name})`,
            teacherId: selectedTeacher?.id || null,
            teacher,
            schedule: '',
            count: 0,
            color: colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-600'
        });
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="إضافة مجموعة جديدة">
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-600 block">نوع المجموعة</label>
                    <div className="grid grid-cols-2 gap-2">
                        {['قرآن', 'تلقين', 'نور بيان', 'إقراء'].map((t) => (
                            <button
                                key={t}
                                type="button"
                                onClick={() => setType(t)}
                                className={cn(
                                    "py-2 rounded-xl text-xs font-bold border transition-all",
                                    type === t ? "bg-purple-600 text-white border-purple-600" : "bg-white text-gray-500 border-gray-100 hover:border-purple-200"
                                )}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                </div>

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

                <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-600 block">المدرس المسؤول</label>
                    <select
                        required
                        value={teacher}
                        onChange={(e) => setTeacher(e.target.value)}
                        className="w-full h-12 bg-gray-50 border border-gray-100 rounded-xl px-4 text-right font-bold focus:outline-none focus:ring-2 focus:ring-purple-500/10"
                    >
                        <option value="">اختر مدرساً</option>
                        {teachers?.map((t) => (
                            <option key={t.id} value={t.fullName}>{t.fullName}</option>
                        ))}
                    </select>
                </div>

                <div className="pt-4">
                    <Button
                        type="submit"
                        className="w-full h-12 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold shadow-lg shadow-purple-500/20"
                        disabled={addMutation.isPending}
                    >
                        {addMutation.isPending ? 'جاري الإضافة...' : 'إضافة المجموعة'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
