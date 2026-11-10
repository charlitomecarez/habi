import { Ionicons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

import { KeyboardAvoidingView } from "@/components/ui/KeyboardAvoidingView";
import { useColors } from "@/lib/colors";

type SheetProps = {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  /** Stays under the list and never scrolls, e.g. the save button of a long list. */
  footer?: ReactNode;
};

/**
 * Bottom sheet for a short form (one or two fields) or a list to pick from. A sheet with a long list
 * puts its save button in `footer`, so it stays in view above the navigation bar.
 */
export function Sheet({ visible, onClose, title, subtitle, children, footer }: SheetProps) {
  const colors = useColors();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
      navigationBarTranslucent
    >
      {/* A Modal is a new window on Android, so it needs its own insets for the navigation bar. */}
      <SafeAreaProvider>
        <KeyboardAvoidingView className="flex-1 justify-end bg-scrim">
          <Pressable accessibilityLabel="Close" onPress={onClose} className="flex-1" />
          <View className="max-h-full rounded-t-sheet bg-surface-card">
            <SafeAreaView edges={["bottom"]} className="shrink">
              <View className="items-center pt-3">
                <View className="h-1 w-chip rounded-pill bg-border-input" />
              </View>
              <View className="flex-row items-center justify-between gap-3 px-5 pt-4">
                <View className="flex-1 gap-1">
                  <Text accessibilityRole="header" className="font-bold text-title text-ink">
                    {title}
                  </Text>
                  {subtitle ? <Text className="font-sans text-caption text-ink-muted">{subtitle}</Text> : null}
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                  onPress={onClose}
                  className="h-touch w-touch items-center justify-center rounded-pill bg-surface-muted"
                >
                  <Ionicons name="close" size={20} color={colors.ink} />
                </Pressable>
              </View>
              <ScrollView
                className="shrink"
                contentContainerClassName={`gap-5 px-5 pt-5 ${footer ? "pb-5" : "pb-8"}`}
                keyboardShouldPersistTaps="handled"
              >
                {children}
              </ScrollView>
              {footer ? <View className="gap-3 border-t-2 border-border px-5 pb-3 pt-3">{footer}</View> : null}
            </SafeAreaView>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaProvider>
    </Modal>
  );
}
