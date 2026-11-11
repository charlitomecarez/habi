import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ItemPhoto } from "@/components/inventory/ItemPhoto";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorNotice } from "@/components/ui/ErrorNotice";
import { Fab } from "@/components/ui/Fab";
import { KeyboardScrollView } from "@/components/ui/KeyboardScrollView";
import { ModuleBar } from "@/components/ui/ModuleHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { useColors } from "@/lib/colors";
import {
  descendantIds,
  matchesSearch,
  useItems,
  useLocations,
  warrantyText,
  type InventoryItem,
} from "@/lib/inventory";
import { listPath, usePhotoUrls } from "@/lib/photos";

const ALL = "all";

function ItemRow({
  item,
  path,
  photoUri,
  last,
}: {
  item: InventoryItem;
  path: string | undefined;
  photoUri: string | undefined;
  last: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.name}, ${path ?? "no location"}, quantity ${item.quantity}${warrantyText(item) ? `, ${warrantyText(item)!.text}` : ""}`}
      onPress={() => router.push({ pathname: "/inventory/item/[id]", params: { id: item.id } })}
      className={`min-h-touch flex-row items-center gap-3 py-3 active:bg-surface-muted ${last ? "" : "border-b-2 border-border"}`}
    >
      <ItemPhoto
        uri={photoUri}
        cacheKey={listPath(item.photo_path)}
        label={item.name}
        className="h-input w-input rounded-md"
      />
      <View className="min-w-0 flex-1 gap-1">
        <Text numberOfLines={1} className="font-semibold text-row-title text-ink">
          {item.name}
        </Text>
        <Text numberOfLines={1} className="font-sans text-caption text-ink-muted">
          {[path ?? "No location", warrantyText(item)?.text].filter(Boolean).join(" · ")}
        </Text>
      </View>
      <Text className="font-sans text-caption text-ink-muted">×{item.quantity}</Text>
    </Pressable>
  );
}

export default function InventoryScreen() {
  const colors = useColors();
  const params = useLocalSearchParams<{ location?: string }>();
  const [query, setQuery] = useState("");
  const [room, setRoom] = useState<string>(ALL);
  // A scanned box label (or a label opened from the phone camera) narrows the list to that place.
  const scanned = params.location ?? null;

  const items = useItems();
  const locations = useLocations();

  const allLocations = locations.data ?? [];
  const pathById = new Map(allLocations.map((l) => [l.id, l.path]));
  const rooms = allLocations.filter((l) => l.depth === 0);
  const filterId = scanned ?? (room === ALL ? null : room);
  const inPlace = filterId === null ? null : descendantIds(allLocations, filterId);

  const visible = (items.data ?? []).filter(
    (item) =>
      (inPlace === null || (item.location_id !== null && inPlace.has(item.location_id))) &&
      matchesSearch(item, item.location_id ? pathById.get(item.location_id) : undefined, query),
  );
  const photos = usePhotoUrls(visible.map((i) => listPath(i.photo_path)));

  const error = items.error ?? locations.error;
  const total = items.data?.length ?? 0;

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-surface-page">
      <ModuleBar tone="home">
        <Text accessibilityRole="header" className="min-w-0 flex-1 font-bold text-title text-ink">
          Inventory
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/inventory/locations")}
          className="h-touch justify-center px-3"
        >
          <Text className="font-semibold text-label text-ink">Locations</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Scan a box label"
          onPress={() => router.push("/inventory/scan")}
          className="h-touch w-touch items-center justify-center"
        >
          <Ionicons name="qr-code-outline" size={22} color={colors.ink} />
        </Pressable>
      </ModuleBar>

      <KeyboardScrollView contentContainerClassName="gap-4 px-5 pb-fab-clear pt-2" keyboardShouldPersistTaps="handled">
        <View className="h-input flex-row items-center gap-3 rounded-input border border-border-input bg-surface-card px-4">
          <Ionicons name="search" size={18} color={colors.inkMuted} />
          <TextInput
            accessibilityLabel="Search items"
            value={query}
            onChangeText={setQuery}
            placeholder="Search items"
            placeholderTextColor={colors.inkMuted}
            autoCorrect={false}
            returnKeyType="search"
            className="h-input flex-1 font-sans text-body text-ink"
          />
          {query ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear search"
              onPress={() => setQuery("")}
              className="h-touch w-touch items-center justify-center"
            >
              <Ionicons name="close-circle" size={18} color={colors.inkMuted} />
            </Pressable>
          ) : null}
        </View>

        {scanned || rooms.length > 0 ? (
          <View
            accessibilityRole="radiogroup"
            accessibilityLabel="Filter by place"
            className="flex-row flex-wrap gap-2"
          >
            <Chip
              variant="filter"
              label="All"
              selected={!scanned && room === ALL}
              onPress={() => {
                router.setParams({ location: undefined });
                setRoom(ALL);
              }}
            />
            {scanned ? (
              <View className="flex-row items-center">
                <Chip
                  variant="filter"
                  label={pathById.get(scanned) ?? "A deleted location"}
                  selected
                  onPress={() => router.setParams({ location: undefined })}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Clear the scanned place"
                  onPress={() => router.setParams({ location: undefined })}
                  className="h-touch w-touch items-center justify-center"
                >
                  <Ionicons name="close-circle" size={20} color={colors.inkMuted} />
                </Pressable>
              </View>
            ) : null}
            {rooms.map((r) => (
              <Chip
                key={r.id}
                variant="filter"
                label={r.name}
                selected={!scanned && room === r.id}
                onPress={() => {
                  router.setParams({ location: undefined });
                  setRoom(r.id);
                }}
              />
            ))}
          </View>
        ) : null}

        {items.isPending || locations.isPending ? (
          <Skeleton />
        ) : error ? (
          <View className="gap-3">
            <ErrorNotice lead="Could not load your inventory." error={error} />
            <Button
              label="Try again"
              variant="secondary"
              size="input"
              onPress={() => {
                items.refetch();
                locations.refetch();
              }}
            />
          </View>
        ) : total === 0 ? (
          <EmptyState
            drawing="box"
            title="No items yet"
            body="I keep track of your things here. Add each one with a photo and where it is."
          />
        ) : visible.length === 0 ? (
          <Text className="py-4 font-sans text-body text-ink-muted">
            {query.trim() ? `No items match “${query.trim()}”.` : "No items here yet."}
          </Text>
        ) : (
          <View>
            {visible.map((item, index) => (
              <ItemRow
                key={item.id}
                item={item}
                path={item.location_id ? pathById.get(item.location_id) : undefined}
                photoUri={item.photo_path ? photos.data?.[listPath(item.photo_path)] : undefined}
                last={index === visible.length - 1}
              />
            ))}
          </View>
        )}
      </KeyboardScrollView>

      <Fab
        label="Add item"
        onPress={() =>
          router.push({
            pathname: "/inventory/item/new",
            params: filterId === null ? {} : { locationId: filterId },
          })
        }
      />
    </SafeAreaView>
  );
}
