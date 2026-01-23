"use client";

import { useUIStore } from '@/store/useUIStore';
import { useAuthStore } from '@/store/useAuthStore';
import { Menu, Bell } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

export default function Header() {
    const { toggleSidebar } = useUIStore();
    const { user } = useAuthStore();

    // Format today's date in Arabic
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
                <button className="p-2 relative hover:bg-gray-100 rounded-full transition-colors text-gray-600">
                    <Bell size={20} />
                    <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
                </button>
            </div>
        </header>
    );
}
