import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { applyTheme } from "@/lib/theme-apply";

export type ThemePreference = "system" | "light" | "dark";

export const THEME_OPTIONS = [
  { value: "system", label: "Same as the phone" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
] as const satisfies readonly { value: ThemePreference; label: string }[];

export function themeLabel(preference: ThemePreference): string {
  return THEME_OPTIONS.find((o) => o.value === preference)?.label ?? "Same as the phone";
}

type ThemeState = {
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
};

/** The theme you picked, kept on this device (the phone and a browser can differ). */
export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      preference: "system",
      setPreference: (preference) => {
        applyTheme(preference);
        set({ preference });
      },
    }),
    {
      name: "my-app-theme",
      storage: createJSONStorage(() => AsyncStorage),
      // Apply the saved theme as soon as it loads on start-up.
      onRehydrateStorage: () => (state) => {
        if (state) applyTheme(state.preference);
      },
    },
  ),
);
