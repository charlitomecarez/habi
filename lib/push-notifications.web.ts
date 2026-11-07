/** Web gets no push. Reminders show in the app and in the daily digest. */
export async function registerForPushNotifications(): Promise<void> {}

export function onPushOpened(_open: (source: unknown, sourceId: unknown) => void): () => void {
  return () => undefined;
}
