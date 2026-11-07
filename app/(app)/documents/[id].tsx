import { Ionicons } from "@expo/vector-icons";
import { format, parseISO } from "date-fns";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { SecurePhotos } from "@/components/ui/SecurePhotos";
import { ModuleBar } from "@/components/ui/ModuleHeader";
import { useColors } from "@/lib/colors";
import { documentStatus, typeLabel, useDeleteDocument, useDocument, useSetDocumentPhotos } from "@/lib/documents";
import { removeEncryptedPhotos, uploadEncryptedPhoto } from "@/lib/secure-photos";

function Detail({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return (
    <View className={`gap-1 px-4 py-3 ${last ? "" : "border-b-2 border-border"}`}>
      <Text className="font-sans text-caption text-ink-muted">{label}</Text>
      <Text selectable className="font-sans text-body text-ink">
        {value}
      </Text>
    </View>
  );
}

export default function DocumentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const doc = useDocument(id);
  const setPhotos = useSetDocumentPhotos();
  const remove = useDeleteDocument();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const d = doc.data;
  if (!d) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-surface-page px-5">
        {doc.isPending ? (
          <ActivityIndicator color={colors.accent} />
        ) : (
          <View className="w-full gap-3">
            <Notice tone="danger">{doc.error ? doc.error.message : "This document was deleted."}</Notice>
            <Button label="Back" variant="secondary" size="input" onPress={() => router.back()} />
          </View>
        )}
      </SafeAreaView>
    );
  }
  const status = documentStatus(d);
  const fmt = (date: string | null) => (date ? format(parseISO(date), "MMMM d, yyyy") : "Not set");

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-surface-page">
      <ModuleBar tone="records">
        <Text
          accessibilityRole="header"
          numberOfLines={1}
          className="min-w-0 flex-1 font-bold text-title text-on-shell"
        >
          {d.name}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Edit document"
          onPress={() => router.push({ pathname: "/documents/edit/[id]", params: { id: d.id } })}
          className="h-touch w-touch items-center justify-center"
        >
          <Ionicons name="create-outline" size={22} color={colors.onShell} />
        </Pressable>
      </ModuleBar>

      <ScrollView contentContainerClassName="gap-5 px-5 pb-8 pt-2">
        <Badge label={status.text} tone={status.tone} />
        {setPhotos.error ? <Notice tone="danger">{setPhotos.error.message}</Notice> : null}

        <View>
          <Detail label="Type" value={typeLabel(d.type)} />
          <Detail label="Number" value={d.number || "Not set"} />
          <Detail label="Issued" value={fmt(d.issued_on)} />
          <Detail label="Expires" value={fmt(d.expires_on)} />
          <Detail
            label="Reminder"
            value={
              d.expires_on ? `${d.remind_days_before} days before it expires, 9:00 AM` : "Set an expiry date to get one"
            }
            last={!d.note}
          />
          {d.note ? <Detail label="Note" value={d.note} last /> : null}
        </View>

        {d.expires_on ? (
          <Button
            label="Renew: set a new expiry date"
            variant="secondary"
            size="input"
            onPress={() => router.push({ pathname: "/documents/edit/[id]", params: { id: d.id } })}
          />
        ) : null}

        <SecurePhotos
          label="Photos"
          subject={`${d.name} photo`}
          paths={d.photo_paths}
          onAdd={async (photo, key) => {
            const path = await uploadEncryptedPhoto("documents", d.id, photo, key);
            await setPhotos.mutateAsync({ id: d.id, paths: [...d.photo_paths, path] });
          }}
          onRemove={async (path) => {
            await setPhotos.mutateAsync({ id: d.id, paths: d.photo_paths.filter((p) => p !== path) });
            await removeEncryptedPhotos([path]);
          }}
        />

        {confirmDelete ? (
          <View className="gap-3 rounded-card border border-danger bg-danger-tint p-4">
            <Text className="font-sans text-body text-danger">Delete this document and its photos?</Text>
            <Button
              label="Delete document"
              variant="destructive"
              size="input"
              loading={remove.isPending}
              onPress={async () => {
                await remove.mutateAsync(d.id);
                await removeEncryptedPhotos(d.photo_paths);
                router.back();
              }}
            />
            <Button label="Keep document" variant="secondary" size="input" onPress={() => setConfirmDelete(false)} />
          </View>
        ) : (
          <Button label="Delete document" variant="destructive" size="input" onPress={() => setConfirmDelete(true)} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
