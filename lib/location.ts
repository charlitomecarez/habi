import * as Location from "expo-location";
import { Linking } from "react-native";

/** Asks only when you tap Use my location. Null when you refuse or the phone cannot tell. */
export async function currentCoords(): Promise<{ latitude: number; longitude: number } | null> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") return null;
  const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  return { latitude: position.coords.latitude, longitude: position.coords.longitude };
}

/** Your spot only when location is already allowed. It never asks. Null otherwise. */
export async function knownCoords(): Promise<{ latitude: number; longitude: number } | null> {
  const { status } = await Location.getForegroundPermissionsAsync();
  if (status !== "granted") return null;
  const position =
    (await Location.getLastKnownPositionAsync({ maxAge: 30 * 60 * 1000 })) ??
    (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
  return { latitude: position.coords.latitude, longitude: position.coords.longitude };
}

/** Opens Habi's page in Android settings, where you can allow location again. */
export async function openLocationSettings(): Promise<void> {
  await Linking.openSettings();
}
