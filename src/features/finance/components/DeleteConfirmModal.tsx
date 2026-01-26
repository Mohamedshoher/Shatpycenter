"use client";

import { useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DeleteConfirmModalProps {
    isOpen: boolean;
    onConfirm: () => void;
    onCancel: () => void;
    title?: string;
    message?: string;
}

export default function DeleteConfirmModal({
    isOpen,
    onConfirm,
    onCancel,
    title = "تأكيد الحذف",
    message = "هل أنت متأكد من حذف هذه المعاملة؟ لا يمكن التراجع عن هذه العملية."
}: DeleteConfirmModalProps) {
    if (!isOpen) return null;

    const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) {
            onCancel();
        }
    };

    return (
        <div
            className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center"
            onClick={handleBackdropClick}
        >
            <div
                className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-lg"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close Button */}
                <div className="flex items-center justify-between mb-4">
                    <button
                        onClick={onCancel}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X size={24} className="text-gray-600" />
                    </button>
                    <h2 className="text-xl font-bold text-gray-900">{title}</h2>
                    <div className="w-10" />
                </div>

                {/* Message */}
                <p className="text-gray-600 text-center mb-6">{message}</p>

                {/* Buttons */}
                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="flex-1 py-3 px-4 rounded-xl border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
                    >
                        إلغاء
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        className="flex-1 py-3 px-4 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors"
                    >
                        حذف
                    </button>
                </div>
            </div>
        </div>
    );
}
