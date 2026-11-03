import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ItemPhoto } from "@/components/inventory/ItemPhoto";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Fab } from "@/components/ui/Fab";
import { Notice } from "@/components/ui/Notice";
import { colors } from "@/lib/colors";
import {
  descendantIds,
  matchesSearch,
  useItems,
  useLocations,
  usePhotoUrls,
  type InventoryItem,
} from "@/lib/inventory";

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
      accessibilityLabel={`${item.name}, ${path ?? "no location"}, quantity ${item.quantity}`}
      onPress={() => router.push({ pathname: "/inventory/item/[id]", params: { id: item.id } })}
      className={`min-h-touch flex-row items-center gap-3 px-4 py-3 active:bg-surface-muted ${last ? "" : "border-b border-divider"}`}
    >
      <ItemPhoto uri={photoUri} label={item.name} className="h-input w-input rounded-md" />
      <View className="min-w-0 flex-1 gap-1">
        <Text numberOfLines={1} className="font-semibold text-row-title text-ink">
          {item.name}
        </Text>
        <Text numberOfLines={1} className="font-sans text-caption text-ink-muted">
          {path ?? "No location"}
          {item.category ? ` · ${item.category}` : ""}
        </Text>
      </View>
      <Text className="font-semibold text-label text-ink-muted">×{item.quantity}</Text>
    </Pressable>
  );
}

export default function InventoryScreen() {
  const [query, setQuery] = useState("");
  const [room, setRoom] = useState<string>(ALL);
  const items = useItems();
  const locations = useLocations();

  const allLocations = locations.data ?? [];
  const pathById = new Map(allLocations.map((l) => [l.id, l.path]));
  const rooms = allLocations.filter((l) => l.depth === 0);
  const inRoom = room === ALL ? null : descendantIds(allLocations, room);

  const visible = (items.data ?? []).filter(
    (item) =>
      (inRoom === null || (item.location_id !== null && inRoom.has(item.location_id))) &&
      matchesSearch(item, item.location_id ? pathById.get(item.location_id) : undefined, query),
  );
  const photos = usePhotoUrls(visible.map((i) => i.photo_path));

  const error = items.error ?? locations.error;
  const total = items.data?.length ?? 0;

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-surface-page">
      <View className="flex-row items-center justify-between gap-1 px-3 pb-2 pt-2">
        <View className="flex-row items-center gap-1">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={() => router.back()}
            className="h-touch w-touch items-center justify-center"
          >
            <Ionicons name="chevron-back" size={22} color={colors.ink} />
          </Pressable>
          <View>
            <Text accessibilityRole="header" className="font-bold text-title text-ink">
              Inventory
            </Text>
            {items.data ? (
              <Text className="font-sans text-caption text-ink-muted">
                {total} {total === 1 ? "item" : "items"} · {allLocations.length}{" "}
                {allLocations.length === 1 ? "location" : "locations"}
              </Text>
            ) : null}
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/inventory/locations")}
          className="h-touch justify-center px-3"
        >
          <Text className="font-semibold text-label text-accent">Locations</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerClassName="gap-4 px-5 pb-32 pt-2" keyboardShouldPersistTaps="handled">
        <View className="h-input flex-row items-center gap-3 rounded-input border border-border-input bg-surface-card px-4">
          <Ionicons name="search" size={18} color={colors.inkMuted} />
          <TextInput
            accessibilityLabel="Search items"
            value={query}
            onChangeText={setQuery}
            placeholder="Search name, place or notes"
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

        {rooms.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            accessibilityRole="radiogroup"
            accessibilityLabel="Filter by room"
            contentContainerClassName="gap-2"
          >
            <Chip label="All" selected={room === ALL} onPress={() => setRoom(ALL)} />
            {rooms.map((r) => (
              <Chip key={r.id} label={r.name} selected={room === r.id} onPress={() => setRoom(r.id)} />
            ))}
          </ScrollView>
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
              {query.trim() ? `No items match “${query.trim()}”.` : "No items in this room yet."}
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
          router.push({ pathname: "/inventory/item/new", params: room === ALL ? {} : { locationId: room } })
        }
      />
    </SafeAreaView>
  );
}
