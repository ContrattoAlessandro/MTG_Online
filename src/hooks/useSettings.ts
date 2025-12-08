import { create } from 'zustand';

/**
 * Settings store for app customization
 * Persists to localStorage
 */
interface SettingsState {
    playmatUrl: string | null;
    setPlaymatUrl: (url: string | null) => void;
}

export const useSettings = create<SettingsState>((set) => ({
    playmatUrl: localStorage.getItem('mtg-playmat-url'),

    setPlaymatUrl: (url) => {
        if (url) {
            localStorage.setItem('mtg-playmat-url', url);
        } else {
            localStorage.removeItem('mtg-playmat-url');
        }
        set({ playmatUrl: url });
    },
}));

export default useSettings;
