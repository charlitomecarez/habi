import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ReportSheet } from "@/components/more/ReportSheet";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Button } from "@/components/ui/Button";
import { KeyboardScrollView } from "@/components/ui/KeyboardScrollView";
import { ModuleLine } from "@/components/ui/ModuleLine";
import { FadeIn } from "@/components/ui/Motion";
import { TabField } from "@/components/ui/ModuleHeader";
import { useColors } from "@/lib/colors";
import { useModuleDetails } from "@/lib/module-details";
import { useModuleFilter } from "@/lib/features";
import { searchModules, visibleSections } from "@/lib/modules";

const SECTION_FIELD: Record<string, string> = {
  daily: "bg-daily-field",
  people: "bg-people-field",
  home: "bg-home-field",
  records: "bg-records-field",
};

export default function MoreScreen() {
  const colors = useColors();
  const [query, setQuery] = useState("");
  const filter = useModuleFilter();
  const sections = visibleSections(searchModules(query), filter);
  const details = useModuleDetails();
  const isAdmin = filter.isAdmin;
  const [reporting, setReporting] = useState(false);

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-surface-page">
      <TabField lead="More" />
      <KeyboardScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="gap-5 pb-8 pt-4">
        <View className="px-5">
          <View className="h-input flex-row items-center gap-3 rounded-input border border-border-input bg-surface-card px-4">
            <TextInput
              accessibilityLabel="Search modules"
              value={query}
              onChangeText={setQuery}
              placeholder="Search modules"
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
        </View>

        <FadeIn>
          <View className="gap-4">
            {sections.map((section) => (
              <View key={section.title}>
                <Text
                  accessibilityRole="header"
                  className={`px-5 py-2 font-bold text-label text-on-shell ${SECTION_FIELD[section.modules[0].tone] ?? "bg-shell"}`}
                >
                  {section.title}
                </Text>
                <View className="flex-row flex-wrap px-5">
                  {section.modules.map((m) => (
                    <ModuleLine
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
              <Text className="px-5 font-sans text-label text-ink-muted">No module matches “{query.trim()}”.</Text>
            ) : null}
          </View>
        </FadeIn>

        <View className="gap-3 px-5">
          <Button label="Report a bug" variant="secondary" size="input" onPress={() => setReporting(true)} />
          {isAdmin ? (
            <Button label="Reports" variant="secondary" size="input" onPress={() => router.push("/reports")} />
          ) : null}
        </View>

        <View className="px-5">
          <SettingsSection />
        </View>
      </KeyboardScrollView>
      <ReportSheet visible={reporting} onClose={() => setReporting(false)} />
    </SafeAreaView>
  );
}
