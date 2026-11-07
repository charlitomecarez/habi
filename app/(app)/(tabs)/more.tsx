import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ReportSheet } from "@/components/more/ReportSheet";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Button } from "@/components/ui/Button";
import { ModuleTile } from "@/components/ui/ModuleTile";
import { FadeIn } from "@/components/ui/Motion";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { useColors } from "@/lib/colors";
import { useModuleDetails } from "@/lib/module-details";
import { searchModules } from "@/lib/modules";
import { useVoiceAccess } from "@/lib/voice";

export default function MoreScreen() {
  const colors = useColors();
  const [query, setQuery] = useState("");
  const sections = searchModules(query);
  const details = useModuleDetails();
  const isAdmin = useVoiceAccess().data?.isAdmin ?? false;
  const [reporting, setReporting] = useState(false);

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-surface-page">
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="gap-5 px-5 pb-8 pt-6">
        <ScreenHeader title="More" />

        <View className="h-input flex-row items-center gap-3 rounded-input border border-border-input bg-surface-card px-4">
          <Ionicons name="search" size={18} color={colors.inkMuted} />
          <TextInput
            accessibilityLabel="Find a module"
            value={query}
            onChangeText={setQuery}
            placeholder="Find a module"
            placeholderTextColor={colors.inkMuted}
            autoCorrect={false}
            returnKeyType="search"
            className="h-input flex-1 font-sans text-body text-ink"
          />
          {query ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear search"
              onPress={() => setQuery("")}
              className="h-touch w-touch items-center justify-center"
            >
              <Ionicons name="close-circle" size={18} color={colors.inkMuted} />
            </Pressable>
          ) : null}
        </View>

        <FadeIn>
          <View className="gap-5">
            {sections.map((section) => (
              <View key={section.title} className="gap-3">
                <Text
                  accessibilityRole="header"
                  className="font-semibold text-caption uppercase tracking-wide text-ink-muted"
                >
                  {section.title}
                </Text>
                <View className="flex-row flex-wrap gap-y-3">
                  {section.modules
                    .filter((m) => isAdmin || !m.adminOnly)
                    .map((m) => (
                      <ModuleTile
                        key={m.id}
                        label={m.label}
                        icon={m.icon}
                        tone={m.tone}
                        detail={details[m.id]}
                        onPress={() => router.push(m.href)}
                      />
                    ))}
                </View>
              </View>
            ))}
            {sections.length === 0 ? (
              <Text className="font-sans text-label text-ink-muted">No module matches “{query.trim()}”.</Text>
            ) : null}
          </View>
        </FadeIn>

        <View className="gap-3">
          <Button label="Report a bug" variant="secondary" size="input" onPress={() => setReporting(true)} />
          {isAdmin ? (
            <Button label="Reports" variant="secondary" size="input" onPress={() => router.push("/reports")} />
          ) : null}
        </View>

        <SettingsSection />
      </ScrollView>
      <ReportSheet visible={reporting} onClose={() => setReporting(false)} />
    </SafeAreaView>
  );
}
