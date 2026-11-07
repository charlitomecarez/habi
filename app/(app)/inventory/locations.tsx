import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AddLocationSheet } from "@/components/inventory/AddLocationSheet";
import { QrCode } from "@/components/inventory/QrCode";
import { Button } from "@/components/ui/Button";
import { Fab } from "@/components/ui/Fab";
import { Notice } from "@/components/ui/Notice";
import { Sheet } from "@/components/ui/Sheet";
import { ModuleBar } from "@/components/ui/ModuleHeader";
import { useColors } from "@/lib/colors";
import { useDeleteLocation, useItems, useLocations, type LocationWithPath } from "@/lib/inventory";
import { locationLink } from "@/lib/qr";

function countLabel(n: number): string {
  return `${n} ${n === 1 ? "item" : "items"}`;
}

export default function LocationsScreen() {
  const colors = useColors();
  const locations = useLocations();
  const items = useItems();
  const remove = useDeleteLocation();
  const [adding, setAdding] = useState<{ parentId: string | null } | null>(null);
  const [selected, setSelected] = useState<LocationWithPath | null>(null);
  const [label, setLabel] = useState<LocationWithPath | null>(null);

  const list = locations.data ?? [];
  const countById = new Map<string, number>();
  for (const item of items.data ?? []) {
    if (item.location_id) countById.set(item.location_id, (countById.get(item.location_id) ?? 0) + 1);
  }
  const childCount = (id: string) => list.filter((l) => l.parent_id === id).length;

  async function onDelete() {
    if (!selected) return;
    await remove.mutateAsync(selected.id);
    setSelected(null);
  }

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-surface-page">
      <ModuleBar tone="home">
        <View>
          <Text accessibilityRole="header" className="font-bold text-title text-on-shell">
            Locations
          </Text>
          <Text className="font-sans text-caption text-on-shell">Rooms, and the shelves and boxes inside them.</Text>
        </View>
      </ModuleBar>

      <ScrollView contentContainerClassName="gap-4 px-5 pb-fab-clear pt-2">
        {locations.isPending ? (
          <ActivityIndicator color={colors.accent} className="py-8" />
        ) : locations.error ? (
          <Notice tone="danger">Could not load locations. {locations.error.message}</Notice>
        ) : list.length === 0 ? (
          <View className="items-center gap-3 py-6">
            <Ionicons name="home-outline" size={32} color={colors.accent} />
            <Text className="text-center font-sans text-body text-ink-muted">
              Start with a room, then add the shelves, drawers and boxes inside it.
            </Text>
          </View>
        ) : (
          <View>
            {list.map((loc, index) => (
              <Pressable
                key={loc.id}
                accessibilityRole="button"
                accessibilityLabel={`${loc.path}, ${countLabel(countById.get(loc.id) ?? 0)}`}
                onPress={() => {
                  remove.reset();
                  setSelected(loc);
                }}
                className={`min-h-touch flex-row items-center gap-3 py-3 pr-4 active:bg-surface-muted ${index < list.length - 1 ? "border-b-2 border-border" : ""} ${loc.depth === 0 ? "pl-4" : loc.depth === 1 ? "pl-6" : "pl-8"}`}
              >
                <Ionicons
                  name={loc.depth === 0 ? "home-outline" : "file-tray-outline"}
                  size={18}
                  color={colors.inkMuted}
                />
                <Text numberOfLines={1} className="min-w-0 flex-1 font-medium text-row-title text-ink">
                  {loc.name}
                </Text>
                <Text className="font-sans text-caption text-ink-muted">{countLabel(countById.get(loc.id) ?? 0)}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>

      <Fab label="Add location" onPress={() => setAdding({ parentId: null })} />

      <AddLocationSheet
        visible={adding !== null}
        onClose={() => setAdding(null)}
        locations={list}
        defaultParentId={adding?.parentId ?? null}
      />

      <Sheet
        visible={selected !== null}
        onClose={() => setSelected(null)}
        title={selected?.name ?? ""}
        subtitle={selected?.path}
      >
        {selected ? (
          <>
            <Text className="font-sans text-body text-ink-muted">
              {countLabel(countById.get(selected.id) ?? 0)} here
              {childCount(selected.id) > 0 ? ` · ${childCount(selected.id)} inside` : ""}.
            </Text>
            <Button
              label="Add a place inside"
              variant="secondary"
              size="input"
              onPress={() => {
                const parentId = selected.id;
                setSelected(null);
                setAdding({ parentId });
              }}
            />
            <Button
              label="Show QR label"
              variant="secondary"
              size="input"
              onPress={() => {
                const location = selected;
                setSelected(null);
                setLabel(location);
              }}
            />
            <Notice tone="warning">
              Deleting keeps its items and the places inside it; they move to &quot;No location&quot;.
            </Notice>
            {remove.error ? <Notice tone="danger">{remove.error.message}</Notice> : null}
            <Button
              label="Delete location"
              variant="destructive"
              size="input"
              loading={remove.isPending}
              onPress={onDelete}
            />
          </>
        ) : null}
      </Sheet>

      <Sheet visible={label !== null} onClose={() => setLabel(null)} title="QR label" subtitle={label?.path}>
        {label ? (
          <>
            <View className="w-3/4 self-center">
              <QrCode value={locationLink(label.id)} label={`QR label for ${label.path}`} />
            </View>
            <Text className="text-center font-semibold text-heading text-ink">{label.name}</Text>
            <Text className="font-sans text-caption text-ink-muted">
              Print this or take a screenshot, and stick it on the box. Scan it from Inventory, or with the phone
              camera, to see what is inside.
            </Text>
          </>
        ) : null}
      </Sheet>
    </SafeAreaView>
  );
}
