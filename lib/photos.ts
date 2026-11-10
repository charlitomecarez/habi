import { useQuery } from "@tanstack/react-query";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";

import { supabase } from "@/lib/supabase";

/** A photo picked on the device that has not been uploaded yet. */
export type LocalPhoto = { uri: string; width: number; height: number };

/**
 * Photo change on save: `undefined` keeps the current photo, `null` removes
 * it, and a LocalPhoto replaces it.
 */
export type PhotoChange = LocalPhoto | null | undefined;

const BUCKET = "user-files";
/** Longest side after resizing. A WebP at this size is about 100 KB, well inside free Storage. */
const PHOTO_MAX_PX = 1280;
/** Longest side of the list copy, for small thumbnails in a list. */
const LIST_MAX_PX = 320;
const PHOTO_QUALITY = 0.7;

/**
 * The small copy of a photo for a list: `<name>.webp` has `<name>.320.webp` beside it. An older
 * JPEG has no list copy, so the list shows the full photo.
 */
export function listPath(path: string): string;
export function listPath(path: string | null): string | null;
export function listPath(path: string | null): string | null {
  if (!path || !path.endsWith(".webp") || path.endsWith(".320.webp")) return path;
  return `${path.slice(0, -".webp".length)}.320.webp`;
}

/** WebP files start with "RIFF" ("UklGR" in base64). Photos saved before v1.5.0 are JPEG. */
export function imageMime(base64: string): "image/webp" | "image/jpeg" {
  return base64.startsWith("UklGR") ? "image/webp" : "image/jpeg";
} /** Signed URLs for the private bucket last an hour; refetch a bit before that. */
const SIGNED_URL_SECONDS = 60 * 60;

export const PHOTO_URLS_KEY = "photo-urls";

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

/** Resizes a picked photo so its longest side is at most `maxPx` (never enlarging) and saves it as WebP. */
export async function compressPhoto(photo: LocalPhoto, maxPx = PHOTO_MAX_PX): Promise<ArrayBuffer> {
  const context = ImageManipulator.manipulate(photo.uri);
  if (Math.max(photo.width, photo.height) > maxPx) {
    context.resize(photo.width >= photo.height ? { width: maxPx } : { height: maxPx });
  }
  const image = await context.renderAsync();
  const saved = await image.saveAsync({ compress: PHOTO_QUALITY, format: SaveFormat.WEBP });
  return (await fetch(saved.uri)).arrayBuffer();
}

export async function currentUserId(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const id = data.session?.user.id;
  if (!id) throw new Error("You are signed out. Sign in again to save photos.");
  return id;
}

/**
 * Resizes a picked photo to WebP and uploads it to `<user_id>/<folder>/<baseName>-<time>.webp`.
 * Inventory photos also get a list copy beside it (see `listPath`). Returns the storage path.
 */
export async function uploadPhoto(
  folder: "inventory" | "receipts" | "journal",
  baseName: string,
  photo: LocalPhoto,
): Promise<string> {
  const userId = await currentUserId();
  const body = await compressPhoto(photo);

  // A new name on every upload, so a cached photo is never shown for a new one.
  const path = `${userId}/${folder}/${baseName}-${Date.now()}.webp`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, body, { contentType: "image/webp" });
  if (error) throw error;

  if (folder === "inventory") {
    const small = await compressPhoto(photo, LIST_MAX_PX);
    const { error: listError } = await supabase.storage
      .from(BUCKET)
      .upload(listPath(path), small, { contentType: "image/webp" });
    if (listError) {
      await removePhoto(path);
      throw listError;
    }
  }
  return path;
}

/** Removes a photo and its list copy, if it has one. */
export async function removePhoto(path: string | null) {
  if (!path) return;
  const paths = [...new Set([path, listPath(path)])];
  // Best effort: a leftover file only costs storage, so a failure here does not fail the save.
  await supabase.storage.from(BUCKET).remove(paths);
}
