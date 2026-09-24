"use client";

import { useEffect, useState } from 'react';
import Wifi from 'lucide-react/dist/esm/icons/wifi'
import WifiOff from 'lucide-react/dist/esm/icons/wifi-off';

function StatusBar({ show, children, className }: { show: boolean; children: React.ReactNode; className: string }) {
    return (
        <div
            className={`fixed top-0 inset-x-0 z-[200] transition-all duration-500 ease-spring ${show ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'} ${className}`}
        >
            {children}
        </div>
    );
}

export default function NetworkStatusBar() {
    const [isOnline, setIsOnline] = useState(true);
    const [showReconnected, setShowReconnected] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [showOffline, setShowOffline] = useState(false);

    useEffect(() => {
        setMounted(true);
        setIsOnline(navigator.onLine);

        const handleOnline = () => {
            setIsOnline(true);
            setShowReconnected(true);
            setShowOffline(false);
            setTimeout(() => setShowReconnected(false), 3000);
        };
        const handleOffline = () => {
            setIsOnline(false);
            setShowOffline(true);
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
        <>
            <StatusBar show={!isOnline && showOffline} className="bg-amber-500 text-white">
                <div className="flex items-center justify-center gap-2 py-2 px-4 text-sm font-black">
                    <WifiOff size={16} />
                    <span>لا يوجد اتصال بالإنترنت — يتم عرض البيانات المحفوظة</span>
                </div>
            </StatusBar>

            <StatusBar show={isOnline && showReconnected} className="bg-emerald-500 text-white">
                <div className="flex items-center justify-center gap-2 py-2 px-4 text-sm font-black">
                    <Wifi size={16} />
                    <span>تم استعادة الاتصال ✓</span>
                </div>
            </StatusBar>
        </>
    );
}
