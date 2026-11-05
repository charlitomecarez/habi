import { useState } from "react";
import { Text, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { DateTimeField } from "@/components/ui/DateTimeField";
import { Input } from "@/components/ui/Input";
import { Sheet } from "@/components/ui/Sheet";
import { putAlarm, removeAlarm, type Alarm } from "@/lib/alarm";
import { WEEKDAY_OPTIONS } from "@/lib/alarm-rules";

type AlarmSheetProps = {
  visible: boolean;
  /** Null adds a new alarm. */
  alarm: Alarm | null;
  onClose: () => void;
  onChanged: () => void;
};

const startTime = (alarm: Alarm | null) => new Date(2026, 0, 1, alarm?.hour ?? 5, alarm?.minute ?? 30);

/** Adds or changes an alarm. The parent gives it a new key for each alarm, so it starts fresh. */
export function AlarmSheet({ visible, alarm, onClose, onChanged }: AlarmSheetProps) {
  const [time, setTime] = useState<Date | null>(startTime(alarm));
  const [days, setDays] = useState<number[]>(alarm?.days ?? [1, 2, 3, 4, 5]);
  const [label, setLabel] = useState(alarm?.label ?? "");

  function done() {
    onChanged();
    onClose();
  }

  function save() {
    const at = time ?? startTime(alarm);
    putAlarm({
      id: alarm?.id ?? Date.now().toString(36),
      hour: at.getHours(),
      minute: at.getMinutes(),
      days,
      label: label.trim(),
      enabled: true,
      atMs: null,
    });
    done();
  }

  return (
    <Sheet visible={visible} onClose={onClose} title={alarm ? "Change alarm" : "New alarm"}>
      <View className="gap-4 px-5 pb-5 pt-3">
        <DateTimeField label="Time" mode="time" value={time} onChange={setTime} />
        <View className="gap-2">
          <Text className="font-semibold text-label text-ink">Days</Text>
          <View className="flex-row flex-wrap gap-2">
            {WEEKDAY_OPTIONS.map((d) => (
              <Chip
                key={d.value}
                label={d.label}
                selected={days.includes(d.value)}
                onPress={() => setDays(days.includes(d.value) ? days.filter((x) => x !== d.value) : [...days, d.value])}
              />
            ))}
          </View>
          <Text className="font-sans text-caption text-ink-muted">With no days, it rings once.</Text>
        </View>
        <Input label="Label" optional value={label} onChangeText={setLabel} maxLength={40} />
        <Button label="Save alarm" onPress={save} />
        {alarm ? (
          <Button
            label="Delete alarm"
            variant="destructive"
            size="input"
            onPress={() => {
              removeAlarm(alarm.id);
              done();
            }}
          />
        ) : null}
      </View>
    </Sheet>
  );
}
