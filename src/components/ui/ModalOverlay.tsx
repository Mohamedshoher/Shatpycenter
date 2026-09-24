"use client";

import { FadeIn, SlideIn } from './transition';

interface ModalOverlayProps {
    isOpen: boolean;
    onClose?: () => void;
    children: React.ReactNode;
    overlayClassName?: string;
    contentClassName?: string;
}

export default function ModalOverlay({ isOpen, onClose, children, overlayClassName = 'bg-black/60 backdrop-blur-sm', contentClassName = '' }: ModalOverlayProps) {
    return (
        <>
            <FadeIn show={isOpen} className="fixed inset-0 z-[100]" duration={300}>
                <div onClick={onClose} className={`absolute inset-0 ${overlayClassName}`} />
            </FadeIn>
            <SlideIn show={isOpen} className={`fixed inset-0 z-[101] flex items-center justify-center ${contentClassName}`} duration={300}>
                {children}
            </SlideIn>
        </>
    );
}
