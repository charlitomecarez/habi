import { Ionicons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { KeyboardAvoidingView, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useColors } from "@/lib/colors";

type SheetProps = {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
};

/** Bottom sheet for a short form (one or two fields) or a list to pick from. */
export function Sheet({ visible, onClose, title, subtitle, children }: SheetProps) {
  const colors = useColors();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior="padding" className="flex-1 justify-end bg-scrim">
        <Pressable accessibilityLabel="Close" onPress={onClose} className="flex-1" />
        <View className="max-h-full rounded-t-sheet bg-surface-card">
          <SafeAreaView edges={["bottom"]}>
            <View className="items-center pt-3">
              <View className="h-1 w-10 rounded-pill bg-border-input" />
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
            <ScrollView contentContainerClassName="gap-5 px-5 pb-8 pt-5" keyboardShouldPersistTaps="handled">
              {children}
            </ScrollView>
          </SafeAreaView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
