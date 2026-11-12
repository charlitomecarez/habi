/** The browser's location, asked only when you tap Use my location. Null when you refuse or it cannot tell. */
export async function currentCoords(): Promise<{ latitude: number; longitude: number } | null> {
  if (typeof navigator === "undefined" || !navigator.geolocation) return null;
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ latitude: p.coords.latitude, longitude: p.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: false, timeout: 15_000, maximumAge: 10 * 60 * 1000 },
    );
  });
}

/** The browser's location only when the site may already use it. It never asks. Null otherwise. */
export async function knownCoords(): Promise<{ latitude: number; longitude: number } | null> {
  if (typeof navigator === "undefined" || !navigator.permissions) return null;
  const permission = await navigator.permissions.query({ name: "geolocation" }).catch(() => null);
  if (permission?.state !== "granted") return null;
  return currentCoords();
}

/** A browser has no settings page to open. Its own location prompt comes back on the next tap. */
export async function openLocationSettings(): Promise<void> {}
