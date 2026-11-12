import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { QrCode } from "@/components/inventory/QrCode";
import { STOP_LABEL } from "@/lib/alarm-rules";
import { ModuleHeader, useHeaderScroll } from "@/components/ui/ModuleHeader";

export default function StopLabelScreen() {
  const { scrollY, onScroll } = useHeaderScroll();
  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-surface-page">
      <ModuleHeader scrollY={scrollY} title="Stop label" tone="daily" />
      <ScrollView onScroll={onScroll} scrollEventThrottle={16} contentContainerClassName="gap-4 px-5 pb-8 pt-3">
        <View className="overflow-hidden">
          <QrCode value={STOP_LABEL} label="QR code that stops the alarm" />
        </View>
        <Text className="font-sans text-body text-ink-muted">
          Take a screenshot and print it. Stick it in the bathroom or the kitchen, far enough that you must get up.
        </Text>
        <Text className="font-sans text-label text-ink-muted">
          Do not keep a copy near your bed, or on another screen you can reach from it.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
