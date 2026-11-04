import "../global.css";

import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  useFonts,
} from "@expo-google-fonts/plus-jakarta-sans";
import { DarkTheme, DefaultTheme, Stack, ThemeProvider, type Theme } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { useColorScheme } from "react-native";

import { useColors, type Palette } from "@/lib/colors";
import { AuthProvider, useAuth } from "@/providers/auth-provider";
import { KeyboardProvider } from "@/providers/keyboard-provider";
import { QueryProvider } from "@/providers/query-provider";

SplashScreen.preventAutoHideAsync();

/** Navigation colours, so the area behind screens matches the app theme. */
function navigationTheme(dark: boolean, colors: Palette): Theme {
  const base = dark ? DarkTheme : DefaultTheme;
  return {
    ...base,
    colors: {
      ...base.colors,
      primary: colors.accent,
      background: colors.surfacePage,
      card: colors.surfaceCard,
      text: colors.ink,
      border: colors.border,
    },
  };
}

function RootNavigator() {
  const { session, isLoading } = useAuth();
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });
  const ready = fontsLoaded && !isLoading;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  const signedIn = session !== null;
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={signedIn} redirectTo="/login">
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={!signedIn} redirectTo="/">
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const dark = useColorScheme() === "dark";
  const colors = useColors();
  return (
    <KeyboardProvider>
      <ThemeProvider value={navigationTheme(dark, colors)}>
        <AuthProvider>
          <QueryProvider>
            <StatusBar style="auto" />
            <RootNavigator />
          </QueryProvider>
        </AuthProvider>
      </ThemeProvider>
    </KeyboardProvider>
  );
}
