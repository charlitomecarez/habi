import { View, type ViewProps } from "react-native";

/** The web has no on-screen keyboard that covers the page, so this is a plain View. */
export function KeyboardAvoidingView(props: ViewProps) {
  return <View {...props} />;
}
