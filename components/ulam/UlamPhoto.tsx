import { Image } from "expo-image";
import { useState } from "react";
import { Text, View } from "react-native";

import { UlamPicture } from "@/components/ulam/UlamPicture";
import type { Ulam } from "@/supabase/functions/_shared/ulam";

/** The dish photo, kept on the phone for no signal. The drawing shows when there is no photo. */
export function UlamPhoto({ ulam }: { ulam: Ulam }) {
  const [state, setState] = useState<{ url?: string; status: "loading" | "shown" | "failed" }>({ status: "loading" });
  const status = state.url === ulam.photo_url ? state.status : "loading";

  if (!ulam.photo_url || status === "failed") {
    return (
      <View className="items-center rounded-card bg-daily-tint py-4">
        <UlamPicture kind={ulam.kind} />
      </View>
    );
  }

  return (
    <View className="gap-1">
      <View className="h-photo items-center justify-center overflow-hidden rounded-card bg-daily-tint">
        {status === "loading" ? (
          <Text className="font-sans text-caption text-ink-muted">Loading the photo…</Text>
        ) : null}
        <Image
          source={{ uri: ulam.photo_url }}
          cachePolicy="disk"
          contentFit="cover"
          accessibilityLabel={`Photo of ${ulam.name}`}
          onLoad={() => setState({ url: ulam.photo_url, status: "shown" })}
          onError={() => setState({ url: ulam.photo_url, status: "failed" })}
          style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
        />
      </View>
      <Text className="font-sans text-caption text-ink-muted">Photo: Wikimedia Commons</Text>
    </View>
  );
}
