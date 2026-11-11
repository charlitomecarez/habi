import { Ionicons } from "@expo/vector-icons";
import { format, parseISO } from "date-fns";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/ui/Button";
import { ConfirmSheet } from "@/components/ui/ConfirmSheet";
import { ErrorNotice } from "@/components/ui/ErrorNotice";
import { Notice } from "@/components/ui/Notice";
import { SecurePhotos } from "@/components/ui/SecurePhotos";
import { ModuleBar } from "@/components/ui/ModuleHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { errorText } from "@/lib/errors";
import { goBack } from "@/lib/navigation";
import { useColors } from "@/lib/colors";
import { useDeleteVisit, useHealth, useSetVisitPhotos } from "@/lib/health";
import { removeEncryptedPhotos, uploadEncryptedPhoto } from "@/lib/secure-photos";

export default function VisitScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const health = useHealth();
  const setPhotos = useSetVisitPhotos();
  const remove = useDeleteVisit();
  const [confirm, setConfirm] = useState(false);
  const v = health.data?.visits.find((x) => x.id === id);

  if (!v) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-surface-page px-5">
        {health.isPending ? (
          <View className="w-full flex-1 self-stretch pt-4">
            <Skeleton layout="detail" />
          </View>
        ) : (
          <View className="w-full gap-3">
            <Notice tone="danger">{health.error ? errorText(health.error) : "This visit was deleted."}</Notice>
            <Button label="Back" variant="secondary" size="input" onPress={goBack} />
          </View>
        )}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-surface-page">
      <ModuleBar tone="daily">
        <Text accessibilityRole="header" numberOfLines={1} className="min-w-0 flex-1 font-bold text-title text-ink">
          {v.doctor || v.reason || "Visit"}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Edit visit"
          onPress={() => router.push({ pathname: "/health/visit/edit/[id]", params: { id: v.id } })}
          className="h-touch w-touch items-center justify-center"
        >
          <Ionicons name="create-outline" size={22} color={colors.ink} />
        </Pressable>
      </ModuleBar>
      <ScrollView contentContainerClassName="gap-5 px-5 pb-8 pt-2">
        <View className="gap-2">
          <Text className="font-medium text-caption text-ink-muted">
            {format(parseISO(v.visited_on), "EEEE, MMMM d, yyyy")}
          </Text>
          {v.reason ? <Text className="font-semibold text-heading text-ink">{v.reason}</Text> : null}
          {v.notes ? <Text className="font-sans text-body text-ink">{v.notes}</Text> : null}
        </View>
        {setPhotos.error ? <ErrorNotice error={setPhotos.error} /> : null}
        <SecurePhotos
          label="Lab results"
          subject="Lab result photo"
          paths={v.photo_paths}
          onAdd={async (photo, key) => {
            const path = await uploadEncryptedPhoto("health", v.id, photo, key);
            await setPhotos.mutateAsync({ id: v.id, paths: [...v.photo_paths, path] });
          }}
          onRemove={async (path) => {
            await setPhotos.mutateAsync({ id: v.id, paths: v.photo_paths.filter((p) => p !== path) });
            await removeEncryptedPhotos([path]);
          }}
        />
        <Button label="Delete visit" variant="destructive" size="input" onPress={() => setConfirm(true)} />
        <ConfirmSheet
          visible={confirm}
          title="Delete this visit and its lab photos?"
          confirmLabel="Delete visit"
          loading={remove.isPending}
          onConfirm={async () => {
            await remove.mutateAsync(v.id);
            await removeEncryptedPhotos(v.photo_paths);
            goBack();
          }}
          onClose={() => setConfirm(false)}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
