import { useMemo } from "react";
import { View } from "react-native";

import { qrMatrix } from "@/lib/qr";

/** Light modules around the code, which scanners need. */
const QUIET_ZONE = 4;

/** A QR code drawn with views. Each row merges runs of the same colour to keep the view count low. */
export function QrCode({ value, label }: { value: string; label: string }) {
  const rows = useMemo(() => {
    const matrix = qrMatrix(value);
    return matrix.map((row) => {
      const runs: { dark: boolean; length: number }[] = [];
      for (const dark of row) {
        const last = runs[runs.length - 1];
        if (last?.dark === dark) last.length += 1;
        else runs.push({ dark, length: 1 });
      }
      return runs;
    });
  }, [value]);
  const size = rows.length + QUIET_ZONE * 2;

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={label}
      className="aspect-square w-full bg-label-paper"
      style={{ padding: `${(QUIET_ZONE / size) * 100}%` as `${number}%` }}
    >
      {rows.map((runs, r) => (
        <View key={r} className="flex-1 flex-row">
          {runs.map((run, i) => (
            <View key={i} className={run.dark ? "bg-label-ink" : "bg-label-paper"} style={{ flex: run.length }} />
          ))}
        </View>
      ))}
    </View>
  );
}
