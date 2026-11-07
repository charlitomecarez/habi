import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import { format } from "date-fns";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { BackHandler, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { ringingAlarmId, scheduleAwakeCheck, stopRinging } from "@/lib/alarm";
import {
  AWAKE_ID,
  AWAKE_WINDOW_MS,
  BACKUP_SUMS,
  isStopLabel,
  makeSums,
  SUMS_AFTER_SCAN,
  TEST_ID,
  type Sum,
} from "@/lib/alarm-rules";
import { useColors } from "@/lib/colors";

type Step = { kind: "awake" } | { kind: "scan" } | { kind: "sums"; sums: Sum[]; index: number };

function Clock() {
  const now = new Date();
  return (
    <View className="items-center gap-1">
      <Text adjustsFontSizeToFit minimumFontScale={0.7} numberOfLines={1} className="font-bold text-display text-ink">
        {format(now, "h:mm")}
      </Text>
      <Text className="font-sans text-label text-ink-muted">{format(now, "EEEE, MMMM d")}</Text>
    </View>
  );
}

function AwakeCheck({ onAwake, onTimeUp }: { onAwake: () => void; onTimeUp: () => void }) {
  const [left, setLeft] = useState(AWAKE_WINDOW_MS / 1000);
  useEffect(() => {
    const started = Date.now();
    const timer = setInterval(() => {
      const next = Math.ceil((AWAKE_WINDOW_MS - (Date.now() - started)) / 1000);
      setLeft(Math.max(next, 0));
      if (next <= 0) onTimeUp();
    }, 500);
    return () => clearInterval(timer);
  }, [onTimeUp]);

  return (
    <>
      <View className="flex-1 items-center justify-center gap-3">
        <Text adjustsFontSizeToFit minimumFontScale={0.7} numberOfLines={1} className="font-bold text-display text-ink">
          0:{String(left).padStart(2, "0")}
        </Text>
        <Text accessibilityRole="header" className="font-bold text-title-lg text-ink">
          Are you awake?
        </Text>
        <Text className="text-center font-sans text-body text-ink-muted">
          If you do not tap in time, the alarm rings again.
        </Text>
      </View>
      <Button label="I am awake" onPress={onAwake} />
    </>
  );
}

function ScanStep({ onScanned, onBackup }: { onScanned: () => void; onBackup: () => void }) {
  const [permission] = useCameraPermissions();
  const [problem, setProblem] = useState<string | null>(null);
  // The camera reports the same code many times a second; act on the first one only.
  const handled = useRef(false);

  function onCode({ data }: BarcodeScanningResult) {
    if (handled.current) return;
    if (!isStopLabel(data)) {
      setProblem("That is not your stop label.");
      return;
    }
    handled.current = true;
    onScanned();
  }

  return (
    <>
      <View className="flex-1 justify-center gap-4">
        <Clock />
        <Text accessibilityRole="header" className="text-center font-bold text-title-lg text-ink">
          Gising na
        </Text>
        <Text className="text-center font-sans text-body text-ink-muted">Walk to your label and scan it.</Text>
        {permission?.granted ? (
          <View className="aspect-square w-full overflow-hidden rounded-hero border border-border">
            <CameraView
              style={{ flex: 1 }}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
              onBarcodeScanned={onCode}
            />
          </View>
        ) : (
          <Notice tone="warning">The camera is off for my-app, so use the sums.</Notice>
        )}
        {problem ? <Notice tone="warning">{problem}</Notice> : null}
      </View>
      <Button label="Camera not working? Solve sums" variant="secondary" size="input" onPress={onBackup} />
    </>
  );
}

function SumStep({
  sum,
  position,
  total,
  onSolved,
}: {
  sum: Sum;
  position: number;
  total: number;
  onSolved: () => void;
}) {
  const colors = useColors();
  const [text, setText] = useState("");
  return (
    <View className="flex-1 items-center justify-center gap-4">
      <Text className="font-sans text-label text-ink-muted">
        Sum {position} of {total}
      </Text>
      <Text accessibilityRole="header" className="font-bold text-display text-ink">
        {sum.text}
      </Text>
      <TextInput
        accessibilityLabel={`Answer to ${sum.text}`}
        autoFocus
        keyboardType="number-pad"
        value={text}
        placeholder="Answer"
        placeholderTextColor={colors.inkMuted}
        onChangeText={(next) => {
          // It moves on by itself, so a sleepy thumb has nothing else to find.
          if (Number(next) === sum.answer) onSolved();
          else setText(next);
        }}
        className="h-input w-full rounded-input border border-border-input bg-surface-card px-4 text-center font-sans text-body text-ink"
      />
    </View>
  );
}

/**
 * Opens over the lock screen, with no session needed, so it shows no personal data.
 * Nothing here stops the sound except finishing the task.
 */
export default function AlarmRingingScreen() {
  const [id] = useState(() => ringingAlarmId());
  const [step, setStep] = useState<Step>(id === AWAKE_ID ? { kind: "awake" } : { kind: "scan" });
  const [timeUp] = useState(() => () => setStep({ kind: "scan" }));

  // The back button must not escape the alarm.
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => true);
    return () => sub.remove();
  }, []);

  function finish(checkAgain: boolean) {
    stopRinging();
    if (checkAgain) scheduleAwakeCheck();
    router.replace("/");
  }

  const startSums = (count: number) => setStep({ kind: "sums", sums: makeSums(count), index: 0 });

  return (
    <SafeAreaView className="flex-1 gap-4 bg-surface-page p-5">
      {step.kind === "awake" ? <AwakeCheck onAwake={() => finish(false)} onTimeUp={timeUp} /> : null}
      {step.kind === "scan" ? (
        <ScanStep onScanned={() => startSums(SUMS_AFTER_SCAN)} onBackup={() => startSums(BACKUP_SUMS)} />
      ) : null}
      {step.kind === "sums" ? (
        <SumStep
          key={step.index}
          sum={step.sums[step.index]}
          position={step.index + 1}
          total={step.sums.length}
          onSolved={() => {
            if (step.index + 1 < step.sums.length) setStep({ ...step, index: step.index + 1 });
            else finish(id !== TEST_ID);
          }}
        />
      ) : null}
    </SafeAreaView>
  );
}
