import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { PHOTO_URLS_KEY, removePhoto, uploadPhoto, type PhotoChange } from "@/lib/photos";
import { supabase } from "@/lib/supabase";
import type { Tables } from "@/types/database";

export type InventoryLocation = Pick<Tables<"inventory_locations">, "id" | "name" | "parent_id">;

export type InventoryItem = Pick<
  Tables<"inventory_items">,
  "id" | "name" | "category" | "quantity" | "notes" | "photo_path" | "location_id" | "updated_at"
>;

/** A location with its full path, e.g. "Bedroom › Shelf › Blue box". */
export type LocationWithPath = InventoryLocation & { path: string; depth: number };

const LOCATIONS_KEY = ["inventory-locations"] as const;
const ITEMS_KEY = ["inventory-items"] as const;

/** Builds each location's path from its parents, sorted so children follow their parent. */
export function withPaths(locations: InventoryLocation[]): LocationWithPath[] {
  const byId = new Map(locations.map((l) => [l.id, l]));
  const pathOf = (loc: InventoryLocation): string[] => {
    const names: string[] = [];
    const seen = new Set<string>();
    let current: InventoryLocation | undefined = loc;
    // The seen set guards against a parent loop, which the database does not fully prevent.
    while (current && !seen.has(current.id)) {
      seen.add(current.id);
      names.unshift(current.name);
      current = current.parent_id ? byId.get(current.parent_id) : undefined;
    }
    return names;
  };
  return locations
    .map((l) => {
      const names = pathOf(l);
      return { ...l, path: names.join(" › "), depth: names.length - 1 };
    })
    .sort((a, b) => a.path.localeCompare(b.path));
}

/** Ids of a location and everything nested inside it. */
export function descendantIds(locations: InventoryLocation[], rootId: string): Set<string> {
  const ids = new Set([rootId]);
  let added = true;
  while (added) {
    added = false;
    for (const l of locations) {
      if (l.parent_id && ids.has(l.parent_id) && !ids.has(l.id)) {
        ids.add(l.id);
        added = true;
      }
    }
  }
  return ids;
}

/** Case-insensitive match on name, category, notes and location path. */
export function matchesSearch(item: InventoryItem, locationPath: string | undefined, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [item.name, item.category, item.notes, locationPath]
    .filter((v): v is string => Boolean(v))
    .some((v) => v.toLowerCase().includes(q));
}

export function useLocations() {
  return useQuery({
    queryKey: LOCATIONS_KEY,
    queryFn: async (): Promise<LocationWithPath[]> => {
      const { data, error } = await supabase.from("inventory_locations").select("id, name, parent_id");
      if (error) throw error;
      return withPaths(data);
    },
  });
}

export function useItems() {
  return useQuery({
    queryKey: ITEMS_KEY,
    queryFn: async (): Promise<InventoryItem[]> => {
      const { data, error } = await supabase
        .from("inventory_items")
        .select("id, name, category, quantity, notes, photo_path, location_id, updated_at")
        .order("name");
      if (error) throw error;
      return data;
    },
  });
}

export function useItem(id: string) {
  const items = useItems();
  return { ...items, data: items.data?.find((i) => i.id === id) };
}

function useInvalidateInventory() {
  const client = useQueryClient();
  return () =>
    Promise.all([
      client.invalidateQueries({ queryKey: ITEMS_KEY }),
      client.invalidateQueries({ queryKey: LOCATIONS_KEY }),
      client.invalidateQueries({ queryKey: [PHOTO_URLS_KEY] }),
    ]);
}

export type ItemInput = {
  name: string;
  locationId: string | null;
  quantity: number;
  category: string | null;
  notes: string | null;
};

export function useSaveItem() {
  const invalidate = useInvalidateInventory();
  return useMutation({
    mutationFn: async ({ item, input, photo }: { item?: InventoryItem; input: ItemInput; photo: PhotoChange }) => {
      const fields = {
        name: input.name,
        location_id: input.locationId,
        quantity: input.quantity,
        category: input.category,
        notes: input.notes,
      };

      let id = item?.id;
      if (id) {
        const { error } = await supabase.from("inventory_items").update(fields).eq("id", id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("inventory_items").insert(fields).select("id").single();
        if (error) throw error;
        id = data.id;
      }

      if (photo === undefined) return;
      const oldPath = item?.photo_path ?? null;
      const newPath = photo ? await uploadPhoto("inventory", id, photo) : null;
      const { error } = await supabase.from("inventory_items").update({ photo_path: newPath }).eq("id", id);
      if (error) {
        await removePhoto(newPath);
        throw error;
      }
      await removePhoto(oldPath);
    },
    onSettled: invalidate,
  });
}

export function useDeleteItem() {
  const invalidate = useInvalidateInventory();
  return useMutation({
    mutationFn: async (item: InventoryItem) => {
      const { error } = await supabase.from("inventory_items").delete().eq("id", item.id);
      if (error) throw error;
      await removePhoto(item.photo_path);
    },
    onSettled: invalidate,
  });
}

export function useAddLocation() {
  const invalidate = useInvalidateInventory();
  return useMutation({
    mutationFn: async (input: { name: string; parentId: string | null }): Promise<string> => {
      const { data, error } = await supabase
        .from("inventory_locations")
        .insert({ name: input.name, parent_id: input.parentId })
        .select("id")
        .single();
      if (error) throw error;
      return data.id;
    },
    onSettled: invalidate,
  });
}

/** Deletes a location. The database moves its items and sub-locations to "no location". */
export function useDeleteLocation() {
  const invalidate = useInvalidateInventory();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("inventory_locations").delete().eq("id", id);
      if (error) throw error;
    },
    onSettled: invalidate,
  });
}
