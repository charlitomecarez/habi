import { Image } from "expo-image";
import { useState } from "react";
import { Text } from "react-native";

import { useAuth } from "@/providers/auth-provider";

/** The Google photo of the signed-in user. Shows the letter for email sign-in, or when the image fails to load. */
export function ProfilePhoto({ letter, letterClassName }: { letter: string; letterClassName: string }) {
  const { session } = useAuth();
  const metadata = session?.user.user_metadata;
  const photo = (metadata?.avatar_url ?? metadata?.picture) as string | undefined;
  const [photoFailed, setPhotoFailed] = useState(false);

  if (!photo || photoFailed) return <Text className={letterClassName}>{letter}</Text>;
  return (
    <Image
      source={{ uri: photo }}
      accessibilityLabel="Your Google photo"
      contentFit="cover"
      onError={() => setPhotoFailed(true)}
      style={{ width: "100%", height: "100%" }}
    />
  );
}
