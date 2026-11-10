import { format, isToday } from "date-fns";
import { Text, View } from "react-native";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DataRow } from "@/components/ui/DataRow";
import { Sheet } from "@/components/ui/Sheet";
import {
  clearTimings,
  formatSeconds,
  kindLabel,
  speedStatus,
  summarize,
  useTimings,
  type SpeedStatus,
} from "@/lib/speed";

const BADGE_TONE: Record<SpeedStatus["tone"], "good" | "warning" | "danger"> = {
  good: "good",
  watch: "warning",
  over: "danger",
};

function clock(at: number): string {
  return format(at, isToday(at) ? "h:mm a" : "MMM d, h:mm a");
}

/** The status word for a median, as a Badge. */
export function SpeedBadge({ ms }: { ms: number }) {
  const status = speedStatus(ms);
  return <Badge label={status.label} tone={BADGE_TONE[status.tone]} />;
}

/** Read-only: how fast this phone's last 50 requests were. Clear times is the only action. */
export function SpeedCheckSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const summary = summarize(useTimings());

  return (
    <Sheet visible={visible} onClose={onClose} title="Speed check" subtitle="The last 50 requests from this phone">
      {summary ? (
        <>
          <View className="gap-1">
            <View
              accessible
              accessibilityLabel={`${(summary.median / 1000).toFixed(2)} seconds, ${speedStatus(summary.median).label}`}
              className="flex-row flex-wrap items-baseline gap-x-3"
            >
              <Text className="font-bold text-display text-ink">{formatSeconds(summary.median)}</Text>
              <SpeedBadge ms={summary.median} />
            </View>
            <Text className="font-sans text-caption text-ink-muted">Typical time for one request</Text>
          </View>
          <View>
            <DataRow
              title="Slowest"
              detail={`${kindLabel(summary.slowest.kind)} · ${clock(summary.slowest.at)}`}
              value={formatSeconds(summary.slowest.ms)}
            />
            <DataRow title="Requests" detail={`Since ${clock(summary.since)}`} value={String(summary.count)} last />
          </View>
          <Text className="font-sans text-caption text-ink-muted">
            I keep only the times, on this phone. A slow phone signal also makes a request slow.
          </Text>
          <Button label="Clear times" variant="plain" onPress={clearTimings} />
        </>
      ) : (
        <View className="gap-2 py-4">
          <Text className="font-semibold text-title text-ink">No requests yet</Text>
          <Text className="font-sans text-body text-ink-muted">
            I time each request while you use the app. Open a few screens, then come back.
          </Text>
        </View>
      )}
    </Sheet>
  );
}
