import { useQuery } from "@tanstack/react-query";

import { compressPhoto, currentUserId, type LocalPhoto } from "@/lib/photos";
import { supabase } from "@/lib/supabase";
import { useVaultStore } from "@/lib/vault";
import { decryptBytesToBase64, encryptBytes } from "@/lib/vault-crypto";

// Photos encrypted on the device with the vault key, for documents and lab results.
// Supabase only ever stores the ciphertext. Never log the bytes or the key.

const BUCKET = "user-files";

/** Compresses, encrypts and uploads a photo to <user_id>/<folder>/<baseName>-<time>.bin. Returns the path. */
export async function uploadEncryptedPhoto(
  folder: "documents" | "health",
  baseName: string,
  photo: LocalPhoto,
  key: Uint8Array,
): Promise<string> {
  const userId = await currentUserId();
  const plain = new Uint8Array(await compressPhoto(photo));
  const sealed = await encryptBytes(key, plain);
  const path = `${userId}/${folder}/${baseName}-${Date.now()}.bin`;
  const body = sealed.buffer.slice(sealed.byteOffset, sealed.byteOffset + sealed.byteLength) as ArrayBuffer;
  const { error } = await supabase.storage.from(BUCKET).upload(path, body, { contentType: "application/octet-stream" });
  if (error) throw error;
  return path;
}

export async function removeEncryptedPhotos(paths: string[]) {
  if (paths.length === 0) return;
  // Best effort: a leftover file is ciphertext and only costs storage.
  await supabase.storage.from(BUCKET).remove(paths);
}

/**
 * A data: URI for an encrypted photo, decrypted in memory while the vault is unlocked.
 * Null data while locked; the screen asks you to unlock.
 */
export function useDecryptedPhoto(path: string | null) {
  const key = useVaultStore((s) => s.key);
  return useQuery({
    queryKey: ["secure-photo", path, key !== null],
    enabled: Boolean(path) && key !== null,
    staleTime: Infinity,
    // Drop the decrypted image from memory soon after the screen closes.
    gcTime: 30 * 1000,
    queryFn: async (): Promise<string> => {
      const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path!, 60);
      if (error) throw error;
      const bytes = new Uint8Array(await (await fetch(data.signedUrl)).arrayBuffer());
      const base64 = await decryptBytesToBase64(key!, bytes);
      if (base64 === null) throw new Error("This photo was encrypted with a different vault key.");
      return `data:image/jpeg;base64,${base64}`;
    },
  });
}
