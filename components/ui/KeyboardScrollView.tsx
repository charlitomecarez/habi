import { cssInterop } from "nativewind";
import type { ComponentProps } from "react";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

// NativeWind maps className only on core components; register this one so contentContainerClassName applies.
cssInterop(KeyboardAwareScrollView, { className: "style", contentContainerClassName: "contentContainerStyle" });

type Props = ComponentProps<typeof KeyboardAwareScrollView>;

// Clears the save button that sits above the keyboard in full-screen forms.
const FIELD_GAP = 96;

/** A ScrollView that scrolls the focused field above the on-screen keyboard. Needs KeyboardProvider at the root. */
export function KeyboardScrollView(props: Props) {
  return <KeyboardAwareScrollView bottomOffset={FIELD_GAP} keyboardShouldPersistTaps="handled" {...props} />;
}
