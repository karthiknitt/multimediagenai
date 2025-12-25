import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface UserPreferences {
  theme: "light" | "dark" | "system";
  defaultModel: "flux2-dev" | "flux2-schnell";
  autoSavePresets: boolean;
  showAdvancedOptions: boolean;
  emailNotifications: boolean;
}

interface UserStats {
  totalGenerations: number;
  imagesGenerated: number;
  videosGenerated: number;
  audioGenerated: number;
  storageUsedMB: number;
  remainingGenerations: number; // For free tier limits
}

interface UserStore {
  // User preferences
  preferences: UserPreferences;
  setPreferences: (prefs: Partial<UserPreferences>) => void;
  resetPreferences: () => void;

  // User stats (fetched from server, not persisted locally)
  stats: UserStats | null;
  setStats: (stats: UserStats) => void;

  // UI state
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;

  // Recently used prompts
  recentPrompts: string[];
  addRecentPrompt: (prompt: string) => void;
  clearRecentPrompts: () => void;
}

const defaultPreferences: UserPreferences = {
  theme: "system",
  defaultModel: "flux2-dev",
  autoSavePresets: true,
  showAdvancedOptions: false,
  emailNotifications: true,
};

export const useUserStore = create<UserStore>()(
  persist(
    (set) => ({
      // Preferences
      preferences: defaultPreferences,
      setPreferences: (prefs) =>
        set((state) => ({
          preferences: { ...state.preferences, ...prefs },
        })),
      resetPreferences: () => set({ preferences: defaultPreferences }),

      // Stats
      stats: null,
      setStats: (stats) => set({ stats }),

      // UI state
      sidebarOpen: true,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),

      // Recent prompts
      recentPrompts: [],
      addRecentPrompt: (prompt) =>
        set((state) => {
          const filtered = state.recentPrompts.filter((p) => p !== prompt);
          return {
            recentPrompts: [prompt, ...filtered].slice(0, 20), // Keep last 20
          };
        }),
      clearRecentPrompts: () => set({ recentPrompts: [] }),
    }),
    {
      name: "user-storage",
      partialize: (state) => ({
        preferences: state.preferences,
        sidebarOpen: state.sidebarOpen,
        recentPrompts: state.recentPrompts,
      }),
    }
  )
);
