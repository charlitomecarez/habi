import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Fab } from "@/components/ui/Fab";
import { Notice } from "@/components/ui/Notice";
import { useColors } from "@/lib/colors";
import { documentStatus, typeLabel, useDocuments } from "@/lib/documents";

export default function DocumentsScreen() {
  const colors = useColors();
  const docs = useDocuments();
  const list = docs.data ?? [];

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-surface-page">
      <View className="flex-row items-center gap-1 px-3 pb-2 pt-2">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => router.back()}
          className="h-touch w-touch items-center justify-center"
        >
          <Ionicons name="chevron-back" size={22} color={colors.ink} />
        </Pressable>
        <Text accessibilityRole="header" className="font-bold text-title text-ink">
          Documents
        </Text>
      </View>

      <ScrollView contentContainerClassName="gap-5 px-5 pb-32 pt-2">
        {docs.isPending ? (
          <ActivityIndicator color={colors.accent} className="py-8" />
        ) : docs.error ? (
          <View className="gap-3">
            <Notice tone="danger">Could not load your documents. {docs.error.message}</Notice>
            <Button label="Try again" variant="secondary" size="input" onPress={() => docs.refetch()} />
          </View>
        ) : (
          <View className="overflow-hidden rounded-card border border-border bg-surface-card">
            {list.length === 0 ? (
              <Text className="px-4 py-3 font-sans text-caption text-ink-muted">
                Add your LTO registration, license, passport, insurance and PhilHealth. Each one reminds you 30 days
                before it expires.
              </Text>
            ) : (
              list.map((d, i) => {
                const status = documentStatus(d);
                return (
                  <Pressable
                    key={d.id}
                    accessibilityRole="button"
                    accessibilityLabel={`${d.name}, ${typeLabel(d.type)}, ${status.text}`}
                    onPress={() => router.push({ pathname: "/documents/[id]", params: { id: d.id } })}
                    className={`min-h-touch flex-row items-center gap-3 px-4 py-3 active:bg-surface-muted ${i === list.length - 1 ? "" : "border-b border-divider"}`}
                  >
                    <View className="min-w-0 flex-1 gap-1">
                      <Text numberOfLines={1} className="font-semibold text-row-title text-ink">
                        {d.name}
                      </Text>
                      <Badge label={status.text} tone={status.tone} />
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.inkMuted} />
                  </Pressable>
                );
              })
            )}
          </View>
        )}
      </ScrollView>

      <Fab label="Add document" onPress={() => router.push("/documents/new")} />
    </SafeAreaView>
  );
}
