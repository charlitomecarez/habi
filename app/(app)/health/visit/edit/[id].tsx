import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { VisitForm } from "@/components/health/VisitForm";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { useColors } from "@/lib/colors";
import { useHealth } from "@/lib/health";

export default function EditVisitScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const health = useHealth();
  const visit = health.data?.visits.find((v) => v.id === id);
  if (visit) return <VisitForm visit={visit} />;
  return (
    <SafeAreaView className="flex-1 items-center justify-center bg-surface-page px-5">
      {health.isPending ? (
        <ActivityIndicator color={colors.accent} />
      ) : (
        <View className="w-full gap-3">
          <Notice tone="danger">{health.error ? health.error.message : "This visit was deleted."}</Notice>
          <Button label="Back" variant="secondary" size="input" onPress={() => router.back()} />
        </View>
      )}
    </SafeAreaView>
  );
}
