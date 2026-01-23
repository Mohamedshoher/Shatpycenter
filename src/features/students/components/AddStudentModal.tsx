"use client";

import { useState, useEffect } from 'react';
import Modal from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { addStudent } from '../services/studentService';
import { Loader2 } from 'lucide-react';
import { Student, Group } from '@/types';
import { getGroups } from '@/features/groups/services/groupService';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/useAuthStore';

interface AddStudentModalProps {
    isOpen: boolean;
    onClose: () => void;
    defaultGroupId?: string;
}

export default function AddStudentModal({ isOpen, onClose, defaultGroupId }: AddStudentModalProps) {
    const queryClient = useQueryClient();
    const [formData, setFormData] = useState({
        fullName: '',
        parentPhone: '',
        address: '',
        enrollmentDate: new Date().toISOString().split('T')[0],
        status: 'active' as const,
        groupId: defaultGroupId || '',
        monthlyAmount: 0,
    });

    const { user } = useAuthStore();

    const { data: groups } = useQuery({
        queryKey: ['groups'],
        queryFn: getGroups
    });

    const myGroups = groups?.filter((g: Group) => {
        if (user?.role === 'teacher') return g.teacherId === user.teacherId;
        return true;
    }) || [];

    const mutation = useMutation({
        mutationFn: (newStudent: Omit<Student, 'id'>) => addStudent(newStudent),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['students'] });
            onClose();
            // Reset form
            setFormData({
                fullName: '',
                parentPhone: '',
                address: '',
                enrollmentDate: new Date().toISOString().split('T')[0],
                status: 'active',
                groupId: defaultGroupId || '',
                monthlyAmount: 0,
            });
        },
    });

    useEffect(() => {
        if (isOpen && defaultGroupId) {
            setFormData(prev => ({ ...prev, groupId: defaultGroupId }));
        }
    }, [isOpen, defaultGroupId]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        mutation.mutate(formData as any);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="إضافة طالب جديد">
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input
                        label="الاسم الرباعي"
                        placeholder="أدخل اسم الطالب بالكامل"
                        value={formData.fullName}
                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                        required
                    />
                    <Input
                        label="رقم هاتف ولي الأمر"
                        placeholder="0123456789"
                        value={formData.parentPhone}
                        onChange={(e) => setFormData({ ...formData, parentPhone: e.target.value })}
                        required
                        dir="ltr"
                    />
                    <Input
                        label="العنوان"
                        placeholder="أدخل عنوان الطالب..."
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    />
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
                            value={formData.groupId}
                            onChange={(e) => setFormData({ ...formData, groupId: e.target.value })}
                            className="w-full h-12 bg-white border border-gray-100 rounded-xl px-4 text-right font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/10 shadow-sm appearance-none"
                            style={{ backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%239ca3af%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'left 1rem center', backgroundSize: '1em' }}
                            required
                        >
                            <option value="">اختر المجموعة</option>
                            {myGroups.map((group: Group) => (
                                <option key={group.id} value={group.id}>{group.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="flex items-center gap-3 pt-4 justify-start">
                    <Button type="submit" disabled={mutation.isPending} className="px-8">
                        {mutation.isPending ? (
                            <div className="flex items-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>جاري الحفظ...</span>
                            </div>
                        ) : "حفظ الطالب"}
                    </Button>
                    <Button type="button" variant="secondary" onClick={onClose}>
                        إلغاء
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
