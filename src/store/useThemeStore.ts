import { create } from 'zustand';

type Theme = 'light' | 'dark';

const THEME_STORAGE_KEY = 'shatpycenter-theme';

const getInitialTheme = (): Theme => {
    if (typeof window === 'undefined') return 'light';
    return localStorage.getItem(THEME_STORAGE_KEY) === 'dark' ? 'dark' : 'light';
};

const applyTheme = (theme: Theme) => {
    if (typeof document === 'undefined') return;
    document.documentElement.classList.toggle('dark', theme === 'dark');
    try {
        localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
        // تجاهل أخطاء التخزين (مثلاً في وضع التصفح الخاص)
    }
};

interface ThemeState {
    theme: Theme;
    toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
    theme: getInitialTheme(),
    toggleTheme: () => {
        const next: Theme = get().theme === 'light' ? 'dark' : 'light';
        applyTheme(next);
        set({ theme: next });
    },
}));
