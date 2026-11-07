import { format, set } from "date-fns";
import { useState } from "react";
import { Text, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { DateTimeField } from "@/components/ui/DateTimeField";
import { Notice } from "@/components/ui/Notice";
import { Sheet } from "@/components/ui/Sheet";
import { sleepMinutes, sleepText, useSaveSleep } from "@/lib/sleep";

const at = (hours: number, minutes = 0) => set(new Date(), { hours, minutes, seconds: 0 });

/** Two fields, so a sheet. Wake time before bedtime means the next day. */
export function SleepSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const save = useSaveSleep();
  const [bed, setBed] = useState<Date | null>(() => at(23));
  const [wake, setWake] = useState<Date | null>(() => at(6));

  const entry = bed && wake ? { bed: format(bed, "HH:mm"), wake: format(wake, "HH:mm") } : null;

  return (
    <Sheet visible={visible} onClose={onClose} title="Log last night's sleep">
      <View className="flex-row gap-3">
        <DateTimeField label="Went to bed" mode="time" value={bed} onChange={setBed} />
        <DateTimeField label="Woke up" mode="time" value={wake} onChange={setWake} />
      </View>
      {entry ? (
        <Text className="font-sans text-caption text-ink-muted">
          {sleepText(sleepMinutes(entry))}. It stays on this phone.
        </Text>
      ) : null}
      {save.error ? <Notice tone="danger">Could not save your sleep.</Notice> : null}
      <Button
        label="Save sleep"
        loading={save.isPending}
        disabled={!entry}
        onPress={() => entry && save.mutate({ day: new Date(), entry }, { onSuccess: onClose })}
      />
    </Sheet>
  );
}
