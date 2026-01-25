import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@/types';

interface AuthState {
    user: User | null;
    loading: boolean;
    setUser: (user: User | null) => void;
    setLoading: (loading: boolean) => void;
    updatePresence: () => void; // ✨ تحديث آخر ظهور
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            user: null,
            loading: true,
            setUser: (user) => {
                set({ user });
                // تحديث آخر ظهور عند تسجيل الدخول
                if (user) {
                    get().updatePresence();
                }
            },
            setLoading: (loading) => set({ loading }),
            updatePresence: async () => {
                const user = get().user;
                if (!user) return;

                try {
                    const { updateUserPresence } = await import('@/features/chat/services/presenceService');
                    await updateUserPresence(user.uid);
                } catch (error) {
                    console.error('Error updating presence:', error);
                }
            },
        }),
        {
            name: 'auth-storage',
            // Only persist the user object, not loading state
            partialize: (state) => ({ user: state.user }),
        }
    )
);
