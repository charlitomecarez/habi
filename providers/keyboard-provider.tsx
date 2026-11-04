import type { ReactNode } from "react";
import { KeyboardProvider as ControllerKeyboardProvider } from "react-native-keyboard-controller";

/** Tracks the on-screen keyboard for components/ui/KeyboardAvoidingView. */
export function KeyboardProvider({ children }: { children: ReactNode }) {
  return <ControllerKeyboardProvider>{children}</ControllerKeyboardProvider>;
}
