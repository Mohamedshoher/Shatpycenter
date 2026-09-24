"use client";

import { useEffect, useRef, useState } from 'react';

interface MountProps {
    show: boolean;
    children: React.ReactNode;
    className?: string;
    duration?: number;
    delay?: number;
}

export function SlideIn({ show, children, className = '', duration = 300 }: MountProps) {
    const [mounted, setMounted] = useState(false);
    const [visible, setVisible] = useState(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    useEffect(() => {
        if (show) {
            setMounted(true);
            requestAnimationFrame(() => {
                requestAnimationFrame(() => setVisible(true));
            });
        } else {
            setVisible(false);
            timerRef.current = setTimeout(() => setMounted(false), duration);
        }
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [show, duration]);

    if (!mounted) return null;

    return (
        <div
            className={`transition-all ease-out ${visible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4'} ${className}`}
            style={{ transitionDuration: `${duration}ms` }}
        >
            {children}
        </div>
    );
}

export function FadeIn({ show, children, className = '', duration = 300 }: MountProps) {
    const [mounted, setMounted] = useState(false);
    const [visible, setVisible] = useState(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    useEffect(() => {
        if (show) {
            setMounted(true);
            requestAnimationFrame(() => {
                requestAnimationFrame(() => setVisible(true));
            });
        } else {
            setVisible(false);
            timerRef.current = setTimeout(() => setMounted(false), duration);
        }
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [show, duration]);

    if (!mounted) return null;

    return (
        <div
            className={`transition-opacity ease-out ${visible ? 'opacity-100' : 'opacity-0'} ${className}`}
            style={{ transitionDuration: `${duration}ms` }}
        >
            {children}
        </div>
    );
}
