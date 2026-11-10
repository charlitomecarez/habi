/** Rules for the query cache: how long each kind of data stays fresh, and what is saved on the phone. */

export const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** The saved cache lasts a week. An older one is dropped, and the screens load again. */
export const MAX_AGE = 7 * DAY;

/**
 * How long each kind of data stays fresh. A fresh query shows its cache and does not ask the
 * server; a stale one shows its cache and refreshes behind it. The first key part picks the row.
 */
export const STALE_TIMES: [string, number][] = [
  // Money, todos, debts and reminders change often.
  ["todos", 30 * SECOND],
  ["money", 30 * SECOND],
  ["debts", 30 * SECOND],
  ["reminders", 30 * SECOND],
  // Vehicle, inventory, health, people and settings change less.
  ["vehicle", 5 * MINUTE],
  ["vehicle-service-due", 5 * MINUTE],
  ["odometer-last", 5 * MINUTE],
  ["inventory-items", 5 * MINUTE],
  ["inventory-locations", 5 * MINUTE],
  ["health", 5 * MINUTE],
  ["people", 5 * MINUTE],
  ["user-settings", 5 * MINUTE],
  // Shared feeds update a few times a day.
  ["news", 30 * MINUTE],
  ["sports", 30 * MINUTE],
  ["ulam", 30 * MINUTE],
  // The models and their service schedules change only with a migration.
  ["vehicle-models", DAY],
  ["service-templates", DAY],
];

/**
 * Never saved on the phone: the vault (its plaintext lives only in memory), decrypted photos,
 * signed photo URLs (they expire in an hour) and the job matches.
 */
export const NOT_SAVED = [
  "vault-entries",
  "vault-settings",
  "vault-biometric",
  "vault-pin",
  "secure-photo",
  "photo-urls",
  "jobs",
];

export function isSaved(queryKey: readonly unknown[]): boolean {
  const first = queryKey[0];
  return typeof first === "string" && !NOT_SAVED.some((k) => first === k || first.startsWith("vault"));
}
