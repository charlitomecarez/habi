import { useColorScheme } from "react-native";

import { useThemeStore } from "@/lib/theme";

// Token values for props that take a colour string (icons, spinners,
// placeholders, navigation). Keep in sync with global.css.
const light = {
  surfacePage: "#F4ECD6",
  surfaceCard: "#FFFBF0",
  border: "#D8CBA6",
  ink: "#1E1B3A",
  inkMuted: "#5A5578",
  onAccent: "#FFFFFF",
  accent: "#23205C",
  warning: "#8A5A00",
  warningInk: "#6B4600",
  danger: "#B4105A",
  daily: "#0F6E84",
  people: "#8A2D8F",
  home: "#A34808",
  records: "#3D4FB5",
  shell: "#23205C",
  onShell: "#F7EFD9",
  onShellMuted: "#CFC8E8",
  gold: "#F5B301",
  good: "#0B7A55",
  watch: "#8A5A00",
  over: "#B4105A",
  goodFill: "#12A071",
  watchFill: "#F5B301",
  overFill: "#D6176E",
};

const dark: Palette = {
  surfacePage: "#14122E",
  surfaceCard: "#1F1C45",
  border: "#37336B",
  ink: "#ECE7F5",
  inkMuted: "#B3AECB",
  onAccent: "#14122E",
  accent: "#B9B4FF",
  warning: "#F5B301",
  warningInk: "#F8D277",
  danger: "#FF6FA8",
  daily: "#6FC8DB",
  people: "#E08FE4",
  home: "#F2A36B",
  records: "#A9B4F2",
  shell: "#2A2670",
  onShell: "#F7EFD9",
  onShellMuted: "#CFC8E8",
  gold: "#F5B301",
  good: "#3FD6A2",
  watch: "#F5B301",
  over: "#FF6FA8",
  goodFill: "#12A071",
  watchFill: "#F5B301",
  overFill: "#D6176E",
};

export type Palette = typeof light;

/** True when the app shows its dark theme: the theme you picked, or the phone's when you left it on System. */
export function useIsDark(): boolean {
  const preference = useThemeStore((s) => s.preference);
  const system = useColorScheme();
  return preference === "system" ? system === "dark" : preference === "dark";
}

/** The token colours for the current theme. */
export function useColors(): Palette {
  return useIsDark() ? dark : light;
}
