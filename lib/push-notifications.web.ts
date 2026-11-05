/** Web gets no push. Reminders show in the app and in the daily digest. */
export async function registerForPushNotifications(): Promise<void> {}

export function onInboxPushOpened(_open: () => void): () => void {
  return () => undefined;
}
