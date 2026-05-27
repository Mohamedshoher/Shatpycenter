"use client";

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { SlideIn, FadeIn } from './transition';
import { cn } from '@/lib/utils';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    className?: string;
}

export default function Modal({ isOpen, onClose, title, children, className }: ModalProps) {
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        window.history.pushState({ modalOpen: true }, '');
        const handlePopState = () => onClose();
        window.addEventListener('popstate', handlePopState);
        return () => {
            window.removeEventListener('popstate', handlePopState);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    return (
        <>
            <FadeIn show={isOpen} className="fixed inset-0 z-[200]" duration={300}>
                <div onClick={onClose} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            </FadeIn>
            <SlideIn show={isOpen} className="fixed inset-0 z-[201] flex items-center justify-center p-4" duration={300}>
                <div ref={modalRef} className={cn(
                    "relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]",
                    className
                )}>
                    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-12 text-right">
                        {children}
                    </div>
                </div>
            </SlideIn>
        </>
    );
}
