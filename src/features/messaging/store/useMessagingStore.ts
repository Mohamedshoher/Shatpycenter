import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface MessagingState {
    token: string | null;
    actor: string | null;
    setSession: (token: string, actor: string) => void;
    clearSession: () => void;
}

export const useMessagingStore = create<MessagingState>()(
    persist(
        (set) => ({
            token: null,
            actor: null,
            setSession: (token, actor) => set({ token, actor }),
            clearSession: () => set({ token: null, actor: null }),
        }),
        {
            name: 'messaging-storage',
        }
    )
);
