import { Ionicons } from "@expo/vector-icons";
import { format, parseISO } from "date-fns";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Badge } from "@/components/ui/Badge";
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
          <View className="w-full flex-1 self-stretch pt-4">
            <Skeleton layout="detail" />
          </View>
        ) : (
          <View className="w-full gap-3">
            <Notice tone="danger">{doc.error ? errorText(doc.error) : "This document was deleted."}</Notice>
            <Button label="Back" variant="secondary" size="input" onPress={goBack} />
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
        <Text accessibilityRole="header" numberOfLines={1} className="min-w-0 flex-1 font-bold text-title text-ink">
          {d.name}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Edit document"
          onPress={() => router.push({ pathname: "/documents/edit/[id]", params: { id: d.id } })}
          className="h-touch w-touch items-center justify-center"
        >
          <Ionicons name="create-outline" size={22} color={colors.ink} />
        </Pressable>
      </ModuleBar>

      <ScrollView contentContainerClassName="gap-5 px-5 pb-8 pt-2">
        <Badge label={status.text} tone={status.tone} />
        {setPhotos.error ? <ErrorNotice error={setPhotos.error} /> : null}

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

        <Button label="Delete document" variant="destructive" size="input" onPress={() => setConfirmDelete(true)} />
        <ConfirmSheet
          visible={confirmDelete}
          title="Delete this document and its photos?"
          confirmLabel="Delete document"
          loading={remove.isPending}
          onConfirm={async () => {
            await remove.mutateAsync(d.id);
            await removeEncryptedPhotos(d.photo_paths);
            goBack();
          }}
          onClose={() => setConfirmDelete(false)}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
