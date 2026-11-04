import { colorScheme } from "nativewind";

import type { ThemePreference } from "@/lib/theme";

/**
 * Android: NativeWind switches the CSS variables in global.css and sets React Native's
 * Appearance, so useColorScheme, the status bar and native pickers follow too.
 */
export function applyTheme(preference: ThemePreference) {
  colorScheme.set(preference);
}
