import { format, set } from "date-fns";
import { useState } from "react";
import { Text, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { DateTimeField } from "@/components/ui/DateTimeField";
import { Notice } from "@/components/ui/Notice";
import { Sheet } from "@/components/ui/Sheet";
import { sleepMinutes, sleepText, useSaveSleep, type SleepEntry } from "@/lib/sleep";
import { refreshWidgets } from "@/lib/widgets";

const at = (hours: number, minutes = 0) => set(new Date(), { hours, minutes, seconds: 0 });
const fromText = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return at(h, m);
};

/**
 * Two fields, so a sheet. Wake time before bedtime means the next day. With an entry, it edits it,
 * and the saved times are marked typed, so the screen never changes them again. The parent keys
 * it by the entry, so the fields start from the entry's times.
 */
export function SleepSheet({ visible, entry, onClose }: { visible: boolean; entry?: SleepEntry; onClose: () => void }) {
  const save = useSaveSleep();
  const [bed, setBed] = useState<Date | null>(() => (entry ? fromText(entry.bed) : at(23)));
  const [wake, setWake] = useState<Date | null>(() => (entry ? fromText(entry.wake) : at(6)));

  const next = bed && wake ? { bed: format(bed, "HH:mm"), wake: format(wake, "HH:mm") } : null;

  return (
    <Sheet visible={visible} onClose={onClose} title={entry ? "Edit last night's sleep" : "Add last night's sleep"}>
      <View className="flex-row gap-3">
        <DateTimeField label="Went to bed" mode="time" value={bed} onChange={setBed} />
        <DateTimeField label="Woke up" mode="time" value={wake} onChange={setWake} />
      </View>
      {next ? (
        <Text className="font-sans text-caption text-ink-muted">
          {sleepText(sleepMinutes(next))}.{" "}
          {entry?.source === "screen" ? "After you save, I keep your times." : "It stays on this phone."}
        </Text>
      ) : null}
      {save.error ? <Notice tone="danger">Could not save your sleep.</Notice> : null}
      <Button
        label="Save sleep"
        loading={save.isPending}
        disabled={!next}
        onPress={() =>
          next &&
          save.mutate(
            { day: new Date(), entry: next },
            {
              onSuccess: () => {
                void refreshWidgets();
                onClose();
              },
            },
          )
        }
      />
    </Sheet>
  );
}
