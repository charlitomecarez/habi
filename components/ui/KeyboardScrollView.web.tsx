import { ScrollView, type ScrollViewProps } from "react-native";

/** The web has no on-screen keyboard that covers the page, so this is a plain ScrollView. */
export function KeyboardScrollView(props: ScrollViewProps) {
  return <ScrollView keyboardShouldPersistTaps="handled" {...props} />;
}
