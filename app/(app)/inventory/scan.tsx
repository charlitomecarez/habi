import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import { router } from "expo-router";
import { useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { useColors } from "@/lib/colors";
import { useLocations } from "@/lib/inventory";
import { parseLocationLink } from "@/lib/qr";

export default function ScanLabelScreen() {
  const colors = useColors();
  const [permission, requestPermission] = useCameraPermissions();
  const locations = useLocations();
  const [problem, setProblem] = useState<string | null>(null);
  // The camera reports the same code many times a second; act on the first one only.
  const handled = useRef(false);

  function onScanned({ data }: BarcodeScanningResult) {
    if (handled.current) return;
    const id = parseLocationLink(data);
    if (!id) {
      setProblem("That code is not a my-app box label.");
      return;
    }
    if (locations.data && !locations.data.some((l) => l.id === id)) {
      setProblem("That label is for a location that no longer exists.");
      return;
    }
    handled.current = true;
    router.dismissTo({ pathname: "/inventory", params: { location: id } });
  }

  return (
    <SafeAreaView className="flex-1 bg-surface-page">
      <View className="flex-row items-center gap-1 px-3 pb-2 pt-2">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          onPress={() => router.back()}
          className="h-touch w-touch items-center justify-center"
        >
          <Ionicons name="close" size={22} color={colors.ink} />
        </Pressable>
        <Text accessibilityRole="header" className="font-bold text-title text-ink">
          Scan a box label
        </Text>
      </View>

      <View className="flex-1 gap-4 px-5 pb-6 pt-2">
        {!permission ? null : permission.granted ? (
          <>
            <View className="aspect-square w-full overflow-hidden rounded-hero border border-border">
              <CameraView
                style={{ flex: 1 }}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                onBarcodeScanned={onScanned}
              />
            </View>
            <Text className="text-center font-sans text-body text-ink-muted">
              Point the camera at the QR label on a box to see what is inside.
            </Text>
            {problem ? <Notice tone="warning">{problem}</Notice> : null}
          </>
        ) : (
          <View className="gap-4">
            <Text className="font-sans text-body text-ink-muted">
              my-app needs the camera to read box labels. Nothing is recorded or uploaded.
            </Text>
            {permission.canAskAgain ? (
              <Button label="Allow camera" onPress={requestPermission} />
            ) : (
              <Notice tone="warning">
                Camera access is off. Turn it on in Settings › Apps › my-app › Permissions.
              </Notice>
            )}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
