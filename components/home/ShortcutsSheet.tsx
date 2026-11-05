import { Text, View } from "react-native";

import { Chip } from "@/components/ui/Chip";
import { Sheet } from "@/components/ui/Sheet";
import { ALL_MODULES, MAX_SHORTCUTS, toggleShortcut } from "@/lib/modules";
import { useSaveUserSettings } from "@/lib/settings";

type ShortcutsSheetProps = { visible: boolean; onClose: () => void; selected: readonly string[] };

/** Picks the modules on Home. Each tap saves, so the phone and web match. */
export function ShortcutsSheet({ visible, onClose, selected }: ShortcutsSheetProps) {
  const save = useSaveUserSettings();
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Shortcuts"
      subtitle={`Pick up to ${MAX_SHORTCUTS} modules for Home.`}
    >
      <View className="flex-row flex-wrap gap-2 px-5 pb-5 pt-3">
        {ALL_MODULES.map((m) => (
          <Chip
            key={m.id}
            label={m.label}
            selected={selected.includes(m.id)}
            onPress={() => save.mutate({ homeShortcuts: toggleShortcut(selected, m.id) })}
          />
        ))}
      </View>
      {save.error ? <Text className="px-5 pb-4 font-sans text-caption text-danger">{save.error.message}</Text> : null}
    </Sheet>
  );
}
