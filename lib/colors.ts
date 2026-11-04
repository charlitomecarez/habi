import { useColorScheme } from "react-native";

// Token values for props that take a colour string (icons, spinners,
// placeholders, navigation). Keep in sync with global.css.
const light = {
  surfacePage: "#F6F6F3",
  surfaceCard: "#FFFFFF",
  border: "#E3E5E0",
  ink: "#1A1C1E",
  inkMuted: "#5B6168",
  onAccent: "#FFFFFF",
  accent: "#0F766E",
  warning: "#A15C07",
  warningInk: "#7A4505",
  danger: "#B42318",
};

const dark: Palette = {
  surfacePage: "#121514",
  surfaceCard: "#1A1E1D",
  border: "#2C3230",
  ink: "#E8EBE9",
  inkMuted: "#A2AAA7",
  onAccent: "#0B1514",
  accent: "#3FB8A9",
  warning: "#E7A64B",
  warningInk: "#F2C27E",
  danger: "#F2837A",
};

export type Palette = typeof light;

/** The token colours for the phone's or browser's current theme. */
export function useColors(): Palette {
  return useColorScheme() === "dark" ? dark : light;
}
