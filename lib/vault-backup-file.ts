import { z } from "zod";

// The backup file holds the rows as Supabase stores them, so it holds nothing readable.
// Pure functions, so they have tests. A plain text export does not exist on purpose: a plain file
// in Drive or Messenger defeats the vault.

const FORMAT = "my-app-vault-backup";
// Version 2 adds the locked copies of the vault key (v1.4.0). Version 1 files still restore.
const VERSION = 2;
const nullableText = z.string().min(1).nullable().optional();

const schema = z.object({
  format: z.literal(FORMAT),
  version: z.union([z.literal(1), z.literal(2)]),
  exportedAt: z.string(),
  settings: z.object({
    kdf: z.string().min(1),
    kdf_salt: z.string().min(1),
    kdf_ops_limit: z.number().int().positive(),
    kdf_mem_limit: z.number().int().positive(),
    key_check: z.string().min(1),
    key_check_nonce: z.string().min(1),
    wrap_version: z.number().int().min(1).max(2).optional(),
    pw_wrap: nullableText,
    pw_wrap_nonce: nullableText,
    recovery_salt: nullableText,
    recovery_wrap: nullableText,
    recovery_wrap_nonce: nullableText,
  }),
  entries: z.array(
    z.object({
      ciphertext: z.string().min(1),
      nonce: z.string().min(1),
      version: z.number().int().positive(),
    }),
  ),
});

export type VaultBackup = z.infer<typeof schema>;

export function buildBackup(settings: VaultBackup["settings"], entries: VaultBackup["entries"], now: Date): string {
  const backup: VaultBackup = { format: FORMAT, version: VERSION, exportedAt: now.toISOString(), settings, entries };
  return JSON.stringify(backup);
}

/** The backup, or null when the text is not a backup file this version can read. */
export function parseBackup(text: string): VaultBackup | null {
  try {
    const result = schema.safeParse(JSON.parse(text));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}
