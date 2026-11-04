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
/** Longest side after resizing. Keeps a photo around 150–300 KB, well inside free Storage. */
const PHOTO_MAX_PX = 1280;
const PHOTO_QUALITY = 0.7;
/** Signed URLs for the private bucket last an hour; refetch a bit before that. */
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

/** Resizes a picked photo so its longest side is PHOTO_MAX_PX (never enlarging) and compresses it to JPEG. */
export async function compressPhoto(photo: LocalPhoto): Promise<ArrayBuffer> {
  const context = ImageManipulator.manipulate(photo.uri);
  if (Math.max(photo.width, photo.height) > PHOTO_MAX_PX) {
    context.resize(photo.width >= photo.height ? { width: PHOTO_MAX_PX } : { height: PHOTO_MAX_PX });
  }
  const image = await context.renderAsync();
  const saved = await image.saveAsync({ compress: PHOTO_QUALITY, format: SaveFormat.JPEG });
  return (await fetch(saved.uri)).arrayBuffer();
}

export async function currentUserId(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const id = data.session?.user.id;
  if (!id) throw new Error("You are signed out. Sign in again to save photos.");
  return id;
}

/**
 * Resizes and compresses a picked photo, then uploads it to
 * `<user_id>/<folder>/<baseName>-<time>.jpg`. Returns its storage path.
 */
export async function uploadPhoto(
  folder: "inventory" | "receipts",
  baseName: string,
  photo: LocalPhoto,
): Promise<string> {
  const userId = await currentUserId();
  const body = await compressPhoto(photo);

  // A new name on every upload, so a cached signed URL never shows the old photo.
  const path = `${userId}/${folder}/${baseName}-${Date.now()}.jpg`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, body, { contentType: "image/jpeg" });
  if (error) throw error;
  return path;
}

export async function removePhoto(path: string | null) {
  if (!path) return;
  // Best effort: a leftover file only costs storage, so a failure here does not fail the save.
  await supabase.storage.from(BUCKET).remove([path]);
}
