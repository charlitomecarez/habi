import { View } from "react-native";

import { Chip } from "@/components/ui/Chip";
import { Notice } from "@/components/ui/Notice";
import { Sheet } from "@/components/ui/Sheet";
import { useModuleFilter } from "@/lib/features";
import { ALL_MODULES, hiddenReason, MAX_SHORTCUTS, toggleShortcut } from "@/lib/modules";
import { useSaveUserSettings } from "@/lib/settings";

type ShortcutsSheetProps = { visible: boolean; onClose: () => void; selected: readonly string[] };

/** Picks the modules on Home. Each tap saves, so the phone and web match. */
export function ShortcutsSheet({ visible, onClose, selected }: ShortcutsSheetProps) {
  const filter = useModuleFilter();
  const save = useSaveUserSettings();
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Shortcuts"
      subtitle={`Pick up to ${MAX_SHORTCUTS} modules for Home.`}
      footer={save.error ? <Notice tone="danger">Could not save your shortcuts.</Notice> : undefined}
    >
      <View className="flex-row flex-wrap gap-2 px-5 pb-5 pt-3">
        {ALL_MODULES.filter((m) => hiddenReason(m, filter) === null).map((m) => (
          <Chip
            key={m.id}
            label={m.label}
            selected={selected.includes(m.id)}
            onPress={() => save.mutate({ homeShortcuts: toggleShortcut(selected, m.id) })}
          />
        ))}
      </View>
    </Sheet>
  );
}
