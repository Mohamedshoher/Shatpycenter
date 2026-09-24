"use client";

import { useState, useEffect } from 'react';
import Modal from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { addStudent } from '../services/studentService';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';
import { Student, Group } from '@/types';
import { getGroups } from '@/features/groups/services/groupService';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/useAuthStore';

interface AddStudentModalProps {
    isOpen: boolean;
    onClose: () => void;
    defaultGroupId?: string;
}

import { AZHAR_CURRICULUM } from '../constants/azharCurriculum';

export default function AddStudentModal({ isOpen, onClose, defaultGroupId }: AddStudentModalProps) {
    const queryClient = useQueryClient();
    const { user } = useAuthStore();
    const isTeacher = user?.role === 'teacher';

    const [formData, setFormData] = useState({
        fullName: '',
        parentPhone: '',
        isOrphan: false,
        isAzhari: false,
        azhariGrade: '',
        enrollmentDate: new Date().toISOString().split('T')[0],
        status: (isTeacher ? 'pending' : 'active') as 'active' | 'archived' | 'pending',
        groupId: defaultGroupId || '',
        monthlyAmount: 80,
    });

    const { data: groups } = useQuery({
        queryKey: ['groups'],
        queryFn: () => getGroups()
    });

    const myGroups = (groups?.filter((g: Group) => {
        if (user?.role === 'teacher') return g.teacherId === user.teacherId;
        return true;
    }) || []).sort((a, b) => a.name.localeCompare(b.name, 'ar'));

    const mutation = useMutation({
        mutationFn: (newStudent: Omit<Student, 'id'>) => addStudent(newStudent),
        onMutate: async (newStudent) => {
            await queryClient.cancelQueries({ queryKey: ['students'] });
            const previousStudents = queryClient.getQueryData(['students']);
            queryClient.setQueryData(['students'], (old: any) => [...(old || []), { ...newStudent, id: 'temp-' + Date.now() }]);

            if (isTeacher) {
                alert('تم إرسال بيانات الطالب، وفي انتظار مراجعة وقبول الإدارة.');
            }
            onClose();
            // Reset form
            setFormData({
                fullName: '',
                parentPhone: '',
                isOrphan: false,
                isAzhari: false,
                azhariGrade: '',
                enrollmentDate: new Date().toISOString().split('T')[0],
                status: isTeacher ? 'pending' : 'active',
                groupId: defaultGroupId || '',
                monthlyAmount: 80,
            });

            return { previousStudents };
        },
        onError: (err, newStudent, context: any) => {
            queryClient.setQueryData(['students'], context?.previousStudents);
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['students'] });
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
        <Modal isOpen={isOpen} onClose={onClose} title="إضافة طالب جديد" className="max-w-4xl h-[95vh] md:h-auto">
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
                            className="w-5 h-5 rounded-md border-gray-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                        />
                    </div>

                    {/* خيار الطالب الأزهري */}
                    <div className="flex items-center justify-between bg-red-50/50 border border-red-100 p-4 rounded-xl h-12">
                        <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                            <label className="text-sm font-bold text-red-900">هل الطالب أزهري؟</label>
                        </div>
                        <input
                            type="checkbox"
                            checked={formData.isAzhari}
                            onChange={(e) => {
                                const checked = e.target.checked;
                                setFormData({
                                    ...formData,
                                    isAzhari: checked,
                                    azhariGrade: checked ? (formData.azhariGrade || AZHAR_CURRICULUM[0].grade) : ''
                                });
                            }}
                            className="w-5 h-5 rounded-md border-gray-300 text-red-600 focus:ring-red-500 cursor-pointer accent-red-600"
                        />
                    </div>

                    {/* عند تحديد أن الطالب أزهري، يظهر اختيار الصف الدراسي والمنهج */}
                    {formData.isAzhari && (
                        <div className="col-span-full bg-gradient-to-br from-red-50/70 to-amber-50/50 border border-red-200/80 p-4 rounded-2xl space-y-3 animate-in fade-in zoom-in-95 duration-200">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-sm font-bold text-red-900 flex items-center gap-1.5">
                                    <span>🕌 الصف الدراسي الأزهري:</span>
                                </label>
                                <select
                                    value={formData.azhariGrade}
                                    onChange={(e) => setFormData({ ...formData, azhariGrade: e.target.value })}
                                    className="w-full h-12 bg-white border border-red-200 rounded-xl px-4 text-right font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-red-500/20 shadow-sm"
                                    required={formData.isAzhari}
                                >
                                    <optgroup label="المرحلة الابتدائية">
                                        {AZHAR_CURRICULUM.filter(c => c.stage === 'الابتدائية').map(c => (
                                            <option key={c.grade} value={c.grade}>
                                                الصف {c.grade} ({c.juz})
                                            </option>
                                        ))}
                                    </optgroup>
                                    <optgroup label="المرحلة الإعدادية">
                                        {AZHAR_CURRICULUM.filter(c => c.stage === 'الإعدادية').map(c => (
                                            <option key={c.grade} value={c.grade}>
                                                الصف {c.grade} ({c.juz})
                                            </option>
                                        ))}
                                    </optgroup>
                                    <optgroup label="المرحلة الثانوية">
                                        {AZHAR_CURRICULUM.filter(c => c.stage === 'الثانوية').map(c => (
                                            <option key={c.grade} value={c.grade}>
                                                الصف {c.grade} ({c.juz})
                                            </option>
                                        ))}
                                    </optgroup>
                                </select>
                            </div>

                            {/* بطاقة توضيحية للمنهج حسب الصف المختار */}
                            {(() => {
                                const curr = AZHAR_CURRICULUM.find(c => c.grade === formData.azhariGrade);
                                if (!curr) return null;
                                return (
                                    <div className="bg-white/90 backdrop-blur border border-red-100 rounded-xl p-3 text-xs grid grid-cols-1 sm:grid-cols-3 gap-2 shadow-xs">
                                        <div className="bg-red-50/50 p-2 rounded-lg border border-red-100/50">
                                            <span className="font-bold text-red-800 block mb-0.5">📖 الفصل الدراسي الأول:</span>
                                            <span className="text-gray-700 font-medium">{curr.term1}</span>
                                        </div>
                                        <div className="bg-amber-50/50 p-2 rounded-lg border border-amber-100/50">
                                            <span className="font-bold text-amber-800 block mb-0.5">📖 الفصل الدراسي الثاني:</span>
                                            <span className="text-gray-700 font-medium">{curr.term2}</span>
                                        </div>
                                        <div className="bg-emerald-50/50 p-2 rounded-lg border border-emerald-100/50">
                                            <span className="font-bold text-emerald-800 block mb-0.5">🎯 المقرر:</span>
                                            <span className="text-emerald-700 font-bold">{curr.juz}</span>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    )}

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
                    {isTeacher && (
                        <div className="col-span-full bg-blue-50 border border-blue-100 p-4 rounded-2xl flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white shrink-0">
                                <span className="text-xl font-bold">!</span>
                            </div>
                            <p className="text-sm font-bold text-blue-700">
                                تنبيه: سيتم تسجيل الطالب كطلب جديد، ولن يظهر في مجموعتك إلا بعد مراجعة وقبول الإدارة أو المشرف.
                            </p>
                        </div>
                    )}


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
