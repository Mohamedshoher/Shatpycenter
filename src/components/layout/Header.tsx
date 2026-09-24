"use client";

import { useUIStore } from '@/store/useUIStore';
import Menu from 'lucide-react/dist/esm/icons/menu'
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import NotificationBell from '@/components/NotificationBell';

export default function Header() {
    const { toggleSidebar } = useUIStore();
    const today = format(new Date(), 'EEEE, d MMMM yyyy', { locale: ar });

    return (
        <header className="sticky top-0 z-30 h-16 bg-white/80 backdrop-blur-md border-b border-gray-100 px-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
                <button
                    onClick={toggleSidebar}
                    className="md:hidden p-2 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors"
                >
                    <Menu size={24} />
                </button>

                <div className="hidden md:block">
                    <p className="text-xs text-gray-500">{today}</p>
                </div>
            </div>

            <div className="flex items-center gap-3">
                <NotificationBell />
            </div>
        </header>
    );
}
