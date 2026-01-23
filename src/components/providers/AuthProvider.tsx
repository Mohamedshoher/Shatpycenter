"use client";

import { useEffect } from 'react';
import { useAuthStore } from '@/store/useAuthStore';

export default function AuthProvider({ children }: { children: React.ReactNode }) {
    const { setUser, setLoading } = useAuthStore();

    useEffect(() => {
        // Mock session persistence: always consider user "checked"
        // but not automatically logged in unless they use the login form
        setLoading(false);
    }, [setUser, setLoading]);

    return <>{children}</>;
}
