"use client";

import { useEffect, useState } from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function NetworkStatusBar() {
    const [isOnline, setIsOnline] = useState(true);
    const [showReconnected, setShowReconnected] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        setIsOnline(navigator.onLine);

        const handleOnline = () => {
            setIsOnline(true);
            setShowReconnected(true);
            // إخفاء رسالة "تم الاتصال" بعد 3 ثواني
            setTimeout(() => setShowReconnected(false), 3000);
        };
        const handleOffline = () => {
            setIsOnline(false);
            setShowReconnected(false);
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    if (!mounted) return null;

    return (
        <AnimatePresence>
            {/* شريط الوضع أوفلاين */}
            {!isOnline && (
                <motion.div
                    key="offline"
                    initial={{ y: -60, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -60, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    className="fixed top-0 inset-x-0 z-[200] flex items-center justify-center gap-2 py-2 px-4 bg-amber-500 text-white text-sm font-black"
                >
                    <WifiOff size={16} />
                    <span>لا يوجد اتصال بالإنترنت — يتم عرض البيانات المحفوظة</span>
                </motion.div>
            )}

            {/* رسالة إعادة الاتصال */}
            {isOnline && showReconnected && (
                <motion.div
                    key="reconnected"
                    initial={{ y: -60, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -60, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    className="fixed top-0 inset-x-0 z-[200] flex items-center justify-center gap-2 py-2 px-4 bg-emerald-500 text-white text-sm font-black"
                >
                    <Wifi size={16} />
                    <span>تم استعادة الاتصال ✓</span>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
