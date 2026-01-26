"use client";

import { useState } from 'react';
import { X, Plus, Loader } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { addTransaction } from '../services/financeService';
import { useAuthStore } from '@/store/useAuthStore';
import { useMutation } from '@tanstack/react-query';

interface AddTransactionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (data: TransactionData) => void;
}

export interface TransactionData {
    type: 'income' | 'expense';
    category: 'fees' | 'salary' | 'donation' | 'utilities' | 'other' | 'تحصيل من مدرس';
    amount: number;
    title: string;
    notes: string;
    date: string;
}

const categoryOptions = {
    income: [
        { value: 'fees', label: 'اشتراكات ورسوم' },
        { value: 'donation', label: 'تبرعات' },
        { value: 'تحصيل من مدرس', label: 'تحصيل من مدرس' },
        { value: 'other', label: 'إيرادات أخرى' },
    ],
    expense: [
        { value: 'salary', label: 'رواتب ومستحقات' },
        { value: 'utilities', label: 'مرافق وصيانة' },
        { value: 'fees', label: 'رسوم وعمولات' },
        { value: 'other', label: 'مصروفات أخرى' },
    ],
};

export default function AddTransactionModal({ isOpen, onClose, onAdd }: AddTransactionModalProps) {
    const { user } = useAuthStore();
    const [type, setType] = useState<'income' | 'expense'>('income');
    const [category, setCategory] = useState<'fees' | 'salary' | 'donation' | 'utilities' | 'other' | 'تحصيل من مدرس'>('fees');
    const [amount, setAmount] = useState('');
    const [title, setTitle] = useState('');
    const [notes, setNotes] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [errors, setErrors] = useState<Record<string, string>>({});

    // حفظ المعاملة في قاعدة البيانات
    const saveMutation = useMutation({
        mutationFn: async (transactionData: TransactionData) => {
            return await addTransaction({
                amount: transactionData.amount,
                type: transactionData.type,
                category: transactionData.category as any,
                date: transactionData.date,
                description: transactionData.title,
                performedBy: user?.uid || 'unknown',
                relatedUserId: undefined
            });
        },
        onSuccess: (result) => {
            if (result) {
                // استدعاء onAdd لتحديث البيانات
                const formData: TransactionData = {
                    type,
                    category: category as any,
                    amount: parseFloat(amount),
                    title,
                    notes,
                    date,
                };
                onAdd(formData);

                // إعادة تعيين النموذج
                resetForm();
                onClose();
            }
        }
    });

    const handleTypeChange = (newType: 'income' | 'expense') => {
        setType(newType);
        setCategory(newType === 'income' ? 'fees' : 'salary');
    };

    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        if (!title.trim()) {
            newErrors.title = 'البيان مطلوب';
        }
        if (!amount || parseFloat(amount) <= 0) {
            newErrors.amount = 'أدخل مبلغاً صحيحاً';
        }
        if (!date) {
            newErrors.date = 'التاريخ مطلوب';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const resetForm = () => {
        setType('income');
        setCategory('fees');
        setAmount('');
        setTitle('');
        setNotes('');
        setDate(new Date().toISOString().split('T')[0]);
        setErrors({});
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        saveMutation.mutate({
            type,
            category: category as any,
            amount: parseFloat(amount),
            title,
            notes,
            date,
        });
    };

    if (!isOpen) return null;

    const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div
            className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center"
            onClick={handleBackdropClick}
        >
            <div
                className="w-full max-w-md bg-white rounded-3xl p-6 max-h-[90vh] overflow-y-auto shadow-lg"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X size={24} className="text-gray-600" />
                    </button>
                    <h2 className="text-xl font-bold text-gray-900">إضافة معاملة مالية</h2>
                    <div className="w-10" />
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Type Selector */}
                    <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-700">نوع المعاملة</label>
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => handleTypeChange('income')}
                                className={cn(
                                    "flex-1 py-3 px-4 rounded-xl font-semibold transition-all",
                                    type === 'income'
                                        ? "bg-green-100 text-green-700 border-2 border-green-500"
                                        : "bg-gray-100 text-gray-600 border-2 border-gray-200"
                                )}
                            >
                                + إيراد
                            </button>
                            <button
                                type="button"
                                onClick={() => handleTypeChange('expense')}
                                className={cn(
                                    "flex-1 py-3 px-4 rounded-xl font-semibold transition-all",
                                    type === 'expense'
                                        ? "bg-red-100 text-red-700 border-2 border-red-500"
                                        : "bg-gray-100 text-gray-600 border-2 border-gray-200"
                                )}
                            >
                                - مصروف
                            </button>
                        </div>
                    </div>

                    {/* Category */}
                    <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-700">الفئة</label>
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value as any)}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            {categoryOptions[type].map((cat) => (
                                <option key={cat.value} value={cat.value}>
                                    {cat.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Amount */}
                    <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-700">المبلغ (ج.م)</label>
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="0"
                            className={cn(
                                "w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500",
                                errors.amount ? "border-red-500" : "border-gray-200"
                            )}
                        />
                        {errors.amount && <p className="text-red-600 text-sm">{errors.amount}</p>}
                    </div>

                    {/* Title */}
                    <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-700">البيان</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="مثال: اشتراك شهري - أحمد"
                            className={cn(
                                "w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500",
                                errors.title ? "border-red-500" : "border-gray-200"
                            )}
                        />
                        {errors.title && <p className="text-red-600 text-sm">{errors.title}</p>}
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-700">ملحوظات (اختيارية)</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="أضف أي ملحوظات تريدها..."
                            rows={3}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        />
                    </div>

                    {/* Date */}
                    <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-700">التاريخ</label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className={cn(
                                "w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500",
                                errors.date ? "border-red-500" : "border-gray-200"
                            )}
                        />
                        {errors.date && <p className="text-red-600 text-sm">{errors.date}</p>}
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={saveMutation.isPending}
                            className="flex-1 py-3 px-4 rounded-xl border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
                        >
                            إلغاء
                        </button>
                        <button
                            type="submit"
                            disabled={saveMutation.isPending}
                            className={cn(
                                "flex-1 py-3 px-4 rounded-xl text-white font-semibold transition-colors flex items-center justify-center gap-2",
                                type === 'income'
                                    ? "bg-green-600 hover:bg-green-700 disabled:bg-green-400"
                                    : "bg-red-600 hover:bg-red-700 disabled:bg-red-400"
                            )}
                        >
                            {saveMutation.isPending ? (
                                <>
                                    <Loader size={16} className="animate-spin" />
                                    جاري الحفظ...
                                </>
                            ) : (
                                'إضافة المعاملة'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
