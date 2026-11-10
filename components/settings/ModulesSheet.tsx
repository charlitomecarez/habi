import { useState } from "react";
import { Switch, Text, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { Sheet } from "@/components/ui/Sheet";
import { useColors } from "@/lib/colors";
import { useModuleFilter } from "@/lib/features";
import { hiddenReason, MODULE_SECTIONS, toggleHidden } from "@/lib/modules";
import { useSaveUserSettings } from "@/lib/settings";

/**
 * Switch off modules you do not use. They leave More and the Home shortcuts on this account; their
 * data stays. A module this server cannot run says so, and its switch is off and disabled. The parent
 * keys the sheet by the saved list, so the switches start from it.
 */
export function ModulesSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const colors = useColors();
  const filter = useModuleFilter();
  const save = useSaveUserSettings();
  const [hidden, setHidden] = useState<string[]>(() => [...filter.hidden]);

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Modules"
      subtitle="Switch off what you do not use. Your data stays."
      footer={
        <>
          {save.error ? <Notice tone="danger">Could not save your modules.</Notice> : null}
          <Button
            label="Save modules"
            loading={save.isPending}
            onPress={() => save.mutate({ hiddenModules: hidden }, { onSuccess: onClose })}
          />
        </>
      }
    >
      {MODULE_SECTIONS.map((section) => {
        const modules = section.modules.filter((m) => hiddenReason(m, { ...filter, hidden: [] }) !== "admin");
        if (modules.length === 0) return null;
        return (
          <View key={section.title}>
            <Text accessibilityRole="header" className="py-2 font-semibold text-heading text-ink">
              {section.title}
            </Text>
            {modules.map((m, index) => {
              const server = hiddenReason(m, { ...filter, hidden: [] }) === "server";
              const on = !server && !hidden.includes(m.id);
              return (
                <View
                  key={m.id}
                  className={`min-h-touch flex-row items-center gap-3 py-2 ${index === modules.length - 1 ? "" : "border-b-2 border-border"}`}
                >
                  <View className="min-w-0 flex-1 gap-1">
                    <Text className={`font-semibold text-row-title ${server ? "text-ink-muted" : "text-ink"}`}>
                      {m.label}
                    </Text>
                    {server ? (
                      <Text className="font-sans text-caption text-ink-muted">Not set up on this server</Text>
                    ) : null}
                  </View>
                  <Switch
                    accessibilityLabel={`Show ${m.label}`}
                    value={on}
                    disabled={server}
                    onValueChange={() => setHidden(toggleHidden(hidden, m.id))}
                    trackColor={{ true: colors.accent }}
                  />
                </View>
              );
            })}
          </View>
        );
      })}
    </Sheet>
  );
}
