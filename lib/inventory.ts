import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";

import { supabase } from "@/lib/supabase";
import type { Tables } from "@/types/database";

export type InventoryLocation = Pick<Tables<"inventory_locations">, "id" | "name" | "parent_id">;

export type InventoryItem = Pick<
  Tables<"inventory_items">,
  "id" | "name" | "category" | "quantity" | "notes" | "photo_path" | "location_id" | "updated_at"
>;

/** A location with its full path, e.g. "Bedroom › Shelf › Blue box". */
export type LocationWithPath = InventoryLocation & { path: string; depth: number };

/** A photo picked on the device that has not been uploaded yet. */
export type LocalPhoto = { uri: string; width: number; height: number };

const BUCKET = "user-files";
/** Longest side after resizing. Keeps a photo around 150–300 KB, well inside free Storage. */
const PHOTO_MAX_PX = 1280;
const PHOTO_QUALITY = 0.7;
/** Signed URLs for the private bucket last an hour; refetch a bit before that. */
const SIGNED_URL_SECONDS = 60 * 60;

const LOCATIONS_KEY = ["inventory-locations"] as const;
const ITEMS_KEY = ["inventory-items"] as const;
const PHOTO_URLS_KEY = "inventory-photo-urls";

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

/** Signed URLs for photo paths in the private bucket, keyed by path. */
export function usePhotoUrls(paths: (string | null)[]) {
  const unique = [...new Set(paths.filter((p): p is string => Boolean(p)))].sort();
  return useQuery({
    queryKey: [PHOTO_URLS_KEY, unique],
    enabled: unique.length > 0,
    staleTime: (SIGNED_URL_SECONDS - 5 * 60) * 1000,
    queryFn: async (): Promise<Record<string, string>> => {
      const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(unique, SIGNED_URL_SECONDS);
      if (error) throw error;
      const urls: Record<string, string> = {};
      for (const row of data) {
        if (row.path && row.signedUrl) urls[row.path] = row.signedUrl;
      }
      return urls;
    },
  });
}

async function currentUserId(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const id = data.session?.user.id;
  if (!id) throw new Error("You are signed out. Sign in again to save photos.");
  return id;
}

/** Resizes and compresses a picked photo, then uploads it. Returns its storage path. */
async function uploadPhoto(itemId: string, photo: LocalPhoto): Promise<string> {
  const userId = await currentUserId();
  const context = ImageManipulator.manipulate(photo.uri);
  // Shrink the longest side to PHOTO_MAX_PX; never enlarge a small photo.
  if (Math.max(photo.width, photo.height) > PHOTO_MAX_PX) {
    context.resize(photo.width >= photo.height ? { width: PHOTO_MAX_PX } : { height: PHOTO_MAX_PX });
  }
  const image = await context.renderAsync();
  const saved = await image.saveAsync({ compress: PHOTO_QUALITY, format: SaveFormat.JPEG });
  const body = await (await fetch(saved.uri)).arrayBuffer();

  // A new name on every upload, so a cached signed URL never shows the old photo.
  const path = `${userId}/inventory/${itemId}-${Date.now()}.jpg`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, body, { contentType: "image/jpeg" });
  if (error) throw error;
  return path;
}

async function removePhoto(path: string | null) {
  if (!path) return;
  // Best effort: a leftover file only costs storage, so a failure here does not fail the save.
  await supabase.storage.from(BUCKET).remove([path]);
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

/**
 * Photo change on save: `undefined` keeps the current photo, `null` removes
 * it, and a LocalPhoto replaces it.
 */
export type PhotoChange = LocalPhoto | null | undefined;

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
      const newPath = photo ? await uploadPhoto(id, photo) : null;
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
    mutationFn: async (input: { name: string; parentId: string | null }) => {
      const { error } = await supabase.from("inventory_locations").insert({ name: input.name, parent_id: input.parentId });
      if (error) throw error;
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
