import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ItemPhoto } from "@/components/inventory/ItemPhoto";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Fab } from "@/components/ui/Fab";
import { Notice } from "@/components/ui/Notice";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { useColors } from "@/lib/colors";
import {
  descendantIds,
  matchesSearch,
  useItems,
  useLocations,
  warrantyText,
  type InventoryItem,
} from "@/lib/inventory";
import { usePhotoUrls } from "@/lib/photos";

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
      className={`min-h-touch flex-row items-center gap-3 px-4 py-3 active:bg-surface-muted ${last ? "" : "border-b border-divider"}`}
    >
      <ItemPhoto uri={photoUri} label={item.name} className="h-input w-input rounded-md" />
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
  const photos = usePhotoUrls(visible.map((i) => i.photo_path));

  const error = items.error ?? locations.error;
  const total = items.data?.length ?? 0;

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-surface-page">
      <View className="flex-row items-center justify-between px-3 pt-2">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => router.back()}
          className="h-touch w-touch items-center justify-center"
        >
          <Ionicons name="chevron-back" size={22} color={colors.ink} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/inventory/locations")}
          className="h-touch justify-center px-3"
        >
          <Text className="font-semibold text-label text-accent">Locations</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerClassName="gap-4 px-5 pb-32 pt-2" keyboardShouldPersistTaps="handled">
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1 gap-1">
            <ScreenHeader title="Inventory" />
            {items.data ? (
              <Text className="font-sans text-label text-ink-muted">
                {total} {total === 1 ? "item" : "items"} in {allLocations.length}{" "}
                {allLocations.length === 1 ? "place" : "places"}
              </Text>
            ) : null}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Scan a box label"
            onPress={() => router.push("/inventory/scan")}
            className="h-touch w-touch items-center justify-center rounded-md border border-border-input bg-surface-card active:bg-surface-muted"
          >
            <Ionicons name="qr-code-outline" size={20} color={colors.ink} />
          </Pressable>
        </View>

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

        {scanned ? (
          <View className="min-h-touch flex-row items-center gap-3 rounded-input bg-accent-tint py-1 pl-4 pr-1">
            <Ionicons name="qr-code-outline" size={18} color={colors.accent} />
            <Text numberOfLines={2} className="flex-1 font-medium text-label text-accent-strong">
              In {pathById.get(scanned) ?? "a deleted location"}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.setParams({ location: undefined })}
              className="h-touch justify-center px-3"
            >
              <Text className="font-semibold text-label text-accent-strong">Show all</Text>
            </Pressable>
          </View>
        ) : rooms.length > 0 ? (
          <View accessibilityRole="radiogroup" accessibilityLabel="Filter by room" className="flex-row flex-wrap gap-2">
            <Chip variant="filter" label="All" selected={room === ALL} onPress={() => setRoom(ALL)} />
            {rooms.map((r) => (
              <Chip key={r.id} variant="filter" label={r.name} selected={room === r.id} onPress={() => setRoom(r.id)} />
            ))}
          </View>
        ) : null}

        {items.isPending || locations.isPending ? (
          <ActivityIndicator color={colors.accent} className="py-8" />
        ) : error ? (
          <View className="gap-3">
            <Notice tone="danger">Could not load your inventory. {error.message}</Notice>
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
          <View className="items-center gap-3 rounded-hero border border-border bg-surface-card p-6">
            <Ionicons name="cube-outline" size={32} color={colors.accent} />
            <Text className="text-center font-sans text-body text-ink-muted">
              Add the things in your room with a photo and where they are, so you can find them later.
            </Text>
          </View>
        ) : visible.length === 0 ? (
          <View className="items-center rounded-card border border-border bg-surface-card p-6">
            <Text className="text-center font-sans text-body text-ink-muted">
              {query.trim() ? `No items match “${query.trim()}”.` : "No items here yet."}
            </Text>
          </View>
        ) : (
          <View className="overflow-hidden rounded-card border border-border bg-surface-card">
            {visible.map((item, index) => (
              <ItemRow
                key={item.id}
                item={item}
                path={item.location_id ? pathById.get(item.location_id) : undefined}
                photoUri={item.photo_path ? photos.data?.[item.photo_path] : undefined}
                last={index === visible.length - 1}
              />
            ))}
          </View>
        )}
      </ScrollView>

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
