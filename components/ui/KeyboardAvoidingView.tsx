import { cssInterop } from "nativewind";
import type { ComponentProps } from "react";
import { KeyboardAvoidingView as ControllerKeyboardAvoidingView } from "react-native-keyboard-controller";

// NativeWind maps className only on core components; register this one so "flex-1" applies.
cssInterop(ControllerKeyboardAvoidingView, { className: "style" });

type Props = Omit<ComponentProps<typeof ControllerKeyboardAvoidingView>, "behavior">;

/**
 * Moves its content above the on-screen keyboard. Android runs edge to edge, so the
 * built-in KeyboardAvoidingView misses the keyboard height; this one reads it from
 * react-native-keyboard-controller. Needs KeyboardProvider at the root.
 */
export function KeyboardAvoidingView(props: Props) {
  return <ControllerKeyboardAvoidingView behavior="padding" {...props} />;
}
