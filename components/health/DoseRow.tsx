import { format } from "date-fns";
import { Text, View } from "react-native";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useMarkDose, type Dose } from "@/lib/health";

/** One dose with Taken and Skipped. Used on Health and on the Home tab. */
export function DoseRow({ dose, last }: { dose: Dose; last: boolean }) {
  const mark = useMarkDose();
  const time = format(new Date(dose.scheduled_at), "h:mm a");
  const late = dose.status === "pending" && new Date(dose.scheduled_at) < new Date();
  return (
    <View className={`gap-2 px-4 py-3 ${last ? "" : "border-b border-divider"}`}>
      <View className="flex-row items-center gap-2">
        <View className="min-w-0 flex-1 gap-1">
          <Text numberOfLines={1} className="font-semibold text-row-title text-ink">
            {dose.medicine_name}
          </Text>
          <Text numberOfLines={1} className="font-sans text-caption text-ink-muted">
            {[time, dose.dose].filter(Boolean).join(" · ")}
          </Text>
        </View>
        {dose.status === "taken" ? (
          <Badge label="Taken" tone="neutral" />
        ) : dose.status === "skipped" ? (
          <Badge label="Skipped" tone="warning" />
        ) : late ? (
          <Badge label="Due now" tone="danger" />
        ) : null}
      </View>
      {dose.status === "pending" ? (
        <View className="flex-row gap-2">
          <View className="flex-1">
            <Button label="Taken" size="input" onPress={() => mark.mutate({ id: dose.id, status: "taken" })} />
          </View>
          <View className="flex-1">
            <Button label="Skipped" variant="secondary" size="input" onPress={() => mark.mutate({ id: dose.id, status: "skipped" })} />
          </View>
        </View>
      ) : (
        <Button label="Undo" variant="secondary" size="input" onPress={() => mark.mutate({ id: dose.id, status: "pending" })} />
      )}
    </View>
  );
}
