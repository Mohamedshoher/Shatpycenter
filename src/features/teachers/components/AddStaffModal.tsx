"use client";

import { useState, useEffect } from 'react';
import Modal from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import {
    User,
    Phone,
    Lock,
    UserCircle,
    GraduationCap,
    Coins,
    Handshake,
    Loader2,
    CheckCircle2,
    AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { addTeacher, updateTeacher } from '../services/teacherService';
import { Teacher } from '@/types';

interface AddStaffModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialTeacher?: Teacher | null;
}

export default function AddStaffModal({ isOpen, onClose, initialTeacher }: AddStaffModalProps) {
    const queryClient = useQueryClient();
    const [formData, setFormData] = useState({
        fullName: initialTeacher?.fullName || '',
        phone: initialTeacher?.phone || '',
        email: (initialTeacher as any)?.email || '',
        role: (initialTeacher as any)?.role || 'teacher' as 'teacher' | 'supervisor',
        accountingType: (initialTeacher as any)?.accountingType || 'fixed' as 'fixed' | 'partnership',
        salary: (initialTeacher as any)?.salary || 0,
        partnershipPercentage: (initialTeacher as any)?.partnershipPercentage || 30,
        password: (initialTeacher as any)?.password || '',
        status: (initialTeacher?.status as any) || 'active' as 'active' | 'inactive',
        responsibleSections: (initialTeacher as any)?.responsibleSections || ['قرآن'] as string[],
    });

    const [error, setError] = useState<string | null>(null);

    // Update form when initialTeacher changes
    useEffect(() => {
        if (initialTeacher) {
            setFormData({
                fullName: initialTeacher.fullName,
                phone: initialTeacher.phone,
                email: (initialTeacher as any).email || '',
                role: (initialTeacher as any).role || 'teacher',
                accountingType: (initialTeacher as any).accountingType || 'fixed',
                salary: (initialTeacher as any).salary || 0,
                partnershipPercentage: (initialTeacher as any).partnershipPercentage || 30,
                password: (initialTeacher as any).password || '',
                status: (initialTeacher.status as any) || 'active',
                responsibleSections: (initialTeacher as any).responsibleSections || ['قرآن'],
            });
        }
    }, [initialTeacher]);

    const toggleSection = (section: string) => {
        setFormData(prev => ({
            ...prev,
            responsibleSections: prev.responsibleSections.includes(section)
                ? prev.responsibleSections.filter((s: string) => s !== section)
                : [...prev.responsibleSections, section]
        }));
    };

    const mutation = useMutation({
        mutationFn: async (data: any) => {
            setError(null); // Clear previous errors
            if (initialTeacher) {
                await updateTeacher(initialTeacher.id, data);
                return;
            }
            await addTeacher(data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['teachers'] });
            onClose();
            if (!initialTeacher) {
                setFormData({
                    fullName: '',
                    phone: '',
                    email: '',
                    role: 'teacher',
                    accountingType: 'fixed',
                    salary: 0,
                    partnershipPercentage: 30,
                    password: '',
                    status: 'active',
                    responsibleSections: ['قرآن'],
                });
            }
        },
        onError: (err: any) => {
            console.error("Mutation failed:", err);
            setError(err.message || "حدث خطأ أثناء الحفظ");
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const email = formData.phone + "@shadbi.com";
        mutation.mutate({ ...formData, email, assignedGroups: initialTeacher?.assignedGroups || [] });
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="إضافة موظف جديد">
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Error Alert */}
                {error && (
                    <div className="bg-red-50 text-red-600 p-4 rounded-[18px] border border-red-100 flex items-center gap-2 text-sm font-bold animate-in fade-in slide-in-from-top-2">
                        <AlertCircle size={18} />
                        <span>{error}</span>
                    </div>
                )}

                {/* Role Toggle */}
                <div className="bg-gray-50/50 p-1 rounded-[20px] flex gap-1 border border-gray-100">
                    <button
                        type="button"
                        onClick={() => setFormData({ ...formData, role: 'teacher' })}
                        className={cn(
                            "flex-1 h-12 rounded-[18px] flex items-center justify-center gap-2 text-sm font-bold transition-all",
                            formData.role === 'teacher'
                                ? "bg-white text-teal-600 shadow-sm border border-gray-200"
                                : "text-gray-400 hover:text-gray-600"
                        )}
                    >
                        <GraduationCap size={18} />
                        مدرس
                    </button>
                    <button
                        type="button"
                        onClick={() => setFormData({ ...formData, role: 'supervisor' })}
                        className={cn(
                            "flex-1 h-12 rounded-[18px] flex items-center justify-center gap-2 text-sm font-bold transition-all",
                            formData.role === 'supervisor'
                                ? "bg-white text-teal-600 shadow-sm border border-gray-200"
                                : "text-gray-400 hover:text-gray-600"
                        )}
                    >
                        <UserCircle size={18} />
                        مشرف
                    </button>
                </div>

                {/* Name & Phone */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5 text-right">
                        <label className="text-[10px] font-black text-gray-400 uppercase mr-1">الاسم</label>
                        <div className="relative group">
                            <input
                                placeholder="الاسم الكامل"
                                value={formData.fullName}
                                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                className="w-full h-12 bg-gray-50/30 border border-gray-100 rounded-[18px] px-10 text-right text-sm font-bold focus:outline-none focus:ring-2 focus:ring-teal-500/10 focus:bg-white transition-all"
                                required
                            />
                            <User className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-teal-500 transition-colors" size={18} />
                        </div>
                    </div>
                    <div className="space-y-1.5 text-right">
                        <label className="text-[10px] font-black text-gray-400 uppercase mr-1">رقم الهاتف</label>
                        <div className="relative group">
                            <input
                                placeholder="رقم الهاتف"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                className="w-full h-12 bg-gray-50/30 border border-gray-100 rounded-[18px] px-10 text-right text-sm font-bold focus:outline-none focus:ring-2 focus:ring-teal-500/10 focus:bg-white transition-all"
                                required
                                dir="ltr"
                            />
                            <Phone className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-teal-500 transition-colors" size={18} />
                        </div>
                    </div>
                </div>

                {/* Accounting Type Section */}
                <div className="bg-teal-50/30 p-4 rounded-[28px] border border-teal-50 space-y-4">
                    <h4 className="text-xs font-black text-teal-700 text-center uppercase tracking-wider">نوع المحاسبة:</h4>
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            type="button"
                            onClick={() => setFormData({ ...formData, accountingType: 'fixed' })}
                            className={cn(
                                "h-14 rounded-2xl flex items-center justify-center gap-2 text-sm font-bold transition-all border",
                                formData.accountingType === 'fixed'
                                    ? "bg-teal-600 text-white border-transparent shadow-lg shadow-teal-600/20"
                                    : "bg-white text-gray-500 border-gray-100"
                            )}
                        >
                            <Coins size={18} />
                            راتب ثابت 💰
                        </button>
                        <button
                            type="button"
                            onClick={() => setFormData({ ...formData, accountingType: 'partnership' })}
                            className={cn(
                                "h-14 rounded-2xl flex items-center justify-center gap-2 text-sm font-bold transition-all border",
                                formData.accountingType === 'partnership'
                                    ? "bg-green-600 text-white border-transparent shadow-lg shadow-green-600/20"
                                    : "bg-white text-gray-500 border-gray-100"
                            )}
                        >
                            <Handshake size={18} />
                            شراكة 🤝
                        </button>
                    </div>
                </div>

                {/* Dynamic Fields Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {formData.accountingType === 'fixed' ? (
                        <div className="space-y-1.5 text-right">
                            <label className="text-[10px] font-black text-gray-400 uppercase mr-1">الراتب الأساسي</label>
                            <div className="relative group">
                                <input
                                    type="number"
                                    placeholder="0.00"
                                    value={formData.salary || ''}
                                    onChange={(e) => setFormData({ ...formData, salary: Number(e.target.value) })}
                                    className="w-full h-12 bg-gray-50/30 border border-gray-100 rounded-[18px] px-10 text-right text-sm font-black text-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-500/10 focus:bg-white transition-all"
                                    required
                                />
                                <Coins className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-teal-500" size={18} />
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-1.5 text-right">
                            <label className="text-[10px] font-black text-gray-400 uppercase mr-1">نسبة الشراكة (%)</label>
                            <div className="relative group">
                                <input
                                    type="number"
                                    placeholder="مثال: 30"
                                    value={formData.partnershipPercentage || ''}
                                    onChange={(e) => setFormData({ ...formData, partnershipPercentage: Number(e.target.value) })}
                                    className="w-full h-12 bg-gray-50/30 border border-gray-100 rounded-[18px] px-10 text-right text-sm font-black text-green-600 focus:outline-none focus:ring-2 focus:ring-green-500/10 focus:bg-white transition-all"
                                    required
                                />
                                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-300 font-bold">%</div>
                            </div>
                            <p className="text-[9px] text-gray-400 text-right mr-1 leading-relaxed">أدخل النسبة المئوية من المحصل (من 1 إلى 100)</p>
                        </div>
                    )}

                    <div className="space-y-1.5 text-right">
                        <label className="text-[10px] font-black text-gray-400 uppercase mr-1">كلمة المرور</label>
                        <div className="relative group">
                            <input
                                placeholder="كلمة المرور"
                                type="text"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                className="w-full h-12 bg-gray-50/30 border border-gray-100 rounded-[18px] px-10 text-right text-sm font-bold focus:outline-none focus:ring-2 focus:ring-teal-500/10 focus:bg-white transition-all"
                                required
                            />
                            <Lock className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-teal-500 transition-colors" size={18} />
                        </div>
                    </div>
                </div>

                {/* Status Dropdown */}
                <div className="space-y-1.5 text-right">
                    <label className="text-[10px] font-black text-gray-400 uppercase mr-1">الحالة</label>
                    <select
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                        className="w-full h-12 bg-gray-50/30 border border-gray-100 rounded-[18px] px-4 text-right text-sm font-bold focus:outline-none focus:ring-2 focus:ring-teal-500/10 focus:bg-white transition-all appearance-none"
                        style={{ backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%239ca3af%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'left 1rem center', backgroundSize: '1.2em' }}
                    >
                        <option value="active">نشط</option>
                        <option value="inactive">غير نشط</option>
                    </select>
                </div>

                {/* Supervisor Specific Sections (Matches Image) */}
                {formData.role === 'supervisor' && (
                    <div className="bg-blue-50/50 p-5 rounded-[28px] border border-blue-100 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                        <h4 className="text-xs font-black text-blue-800 text-center uppercase tracking-wider">الأقسام المسؤول عنها:</h4>
                        <div className="flex flex-row-reverse items-center justify-center gap-3">
                            {[
                                { id: 'قرآن', label: 'قرآن' },
                                { id: 'نور بيان', label: 'نور بيان' },
                                { id: 'تلقين', label: 'تلقين' }
                            ].map(section => {
                                const isSelected = formData.responsibleSections.includes(section.id);
                                return (
                                    <button
                                        key={section.id}
                                        type="button"
                                        onClick={() => toggleSection(section.id)}
                                        className={cn(
                                            "h-11 px-6 rounded-full text-xs font-bold transition-all border flex items-center gap-2",
                                            isSelected
                                                ? "bg-blue-600 text-white border-transparent shadow-lg shadow-blue-600/20"
                                                : "bg-white text-gray-400 border-gray-100 hover:border-gray-200"
                                        )}
                                    >
                                        {isSelected && <CheckCircle2 size={14} />}
                                        {section.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Buttons */}
                <div className="flex items-center gap-3 pt-6">
                    <button
                        type="submit"
                        disabled={mutation.isPending}
                        className="flex-1 h-14 bg-teal-600 hover:bg-teal-700 text-white rounded-[20px] font-black text-sm shadow-xl shadow-teal-600/20 active:scale-[0.98] transition-all disabled:opacity-50"
                    >
                        {mutation.isPending ? (
                            <div className="flex items-center justify-center gap-2">
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span>جاري الحفظ...</span>
                            </div>
                        ) : "حفظ البيانات"}
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-24 h-14 bg-gray-50 hover:bg-gray-100 text-gray-500 rounded-[20px] font-bold text-sm transition-all"
                    >
                        إلغاء
                    </button>
                </div>
            </form>
        </Modal>
    );
}
