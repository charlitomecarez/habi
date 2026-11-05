import { useState } from "react";
import { Switch, Text, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { Sheet } from "@/components/ui/Sheet";
import { useColors } from "@/lib/colors";
import { shareTripPdf } from "@/lib/trip-pdf";
import { tripHtml, type Trip, type TripItem } from "@/lib/travel";

type Props = { visible: boolean; onClose: () => void; trip: Trip; items: readonly TripItem[] };

/** Exports a clean day-by-day plan. Booking references, notes and ideas stay in the app. */
export function ExportSheet({ visible, onClose, trip, items }: Props) {
  const colors = useColors();
  const [includeCosts, setIncludeCosts] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  async function onExport() {
    setBusy(true);
    setProblem(null);
    try {
      await shareTripPdf(tripHtml(trip, items, { includeCosts }), trip.title);
      onClose();
    } catch (error) {
      setProblem(error instanceof Error ? error.message : "Could not make the PDF.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Export PDF"
      subtitle="Booking references, notes and ideas stay in the app. The PDF is a copy from now."
    >
      <View className="gap-4 px-5 pb-5 pt-3">
        <View className="min-h-touch flex-row items-center justify-between gap-3">
          <Text className="flex-1 font-medium text-row-title text-ink">Include costs (optional)</Text>
          <Switch
            accessibilityLabel="Include costs"
            value={includeCosts}
            onValueChange={setIncludeCosts}
            trackColor={{ true: colors.accent }}
          />
        </View>
        {problem ? <Notice tone="danger">{problem}</Notice> : null}
        <Button label="Export PDF" loading={busy} onPress={onExport} />
      </View>
    </Sheet>
  );
}
