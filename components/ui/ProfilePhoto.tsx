import { Image } from "expo-image";
import { useState } from "react";
import { Text } from "react-native";

import { useAuth } from "@/providers/auth-provider";

type ProfilePhotoProps = {
  letter: string;
  letterClassName: string;
  /** The circle's size in px. The photo is drawn at exactly this size. */
  size: number;
};

/**
 * The Google photo of the signed-in user. Google gives two addresses (avatar_url and picture); if one
 * fails, it tries the other. It shows the letter for email sign-in, or when both fail to load.
 */
export function ProfilePhoto({ letter, letterClassName, size }: ProfilePhotoProps) {
  const { session } = useAuth();
  const metadata = session?.user.user_metadata;
  const photos = [...new Set([metadata?.avatar_url, metadata?.picture].filter((u): u is string => !!u))];
  const [tries, setTries] = useState<{ key: string; failed: number }>({ key: "", failed: 0 });
  // A new sign-in brings new addresses, so the count of failures starts again.
  const key = photos.join(" ");
  const failed = tries.key === key ? tries.failed : 0;
  const photo = photos[failed];

  if (!photo) return <Text className={letterClassName}>{letter}</Text>;
  return (
    <Image
      key={photo}
      source={{ uri: photo }}
      accessibilityLabel="Your Google photo"
      contentFit="cover"
      cachePolicy="disk"
      onError={() => setTries({ key, failed: failed + 1 })}
      style={{ width: size, height: size }}
    />
  );
}
