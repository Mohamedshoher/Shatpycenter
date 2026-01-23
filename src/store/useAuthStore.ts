import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@/types';

interface AuthState {
    user: User | null;
    loading: boolean;
    setUser: (user: User | null) => void;
    setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            loading: true,
            setUser: (user) => set({ user }),
            setLoading: (loading) => set({ loading }),
        }),
        {
            name: 'auth-storage',
            // Only persist the user object, not loading state
            partialize: (state) => ({ user: state.user }),
        }
    )
);
