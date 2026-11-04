import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { VideoForm } from "@/components/content/VideoForm";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { useColors } from "@/lib/colors";
import { useVideo } from "@/lib/content";

export default function EditVideoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const video = useVideo(id);
  if (video.data) return <VideoForm video={video.data} />;
  return (
    <SafeAreaView className="flex-1 items-center justify-center bg-surface-page px-5">
      {video.isPending ? (
        <ActivityIndicator color={colors.accent} />
      ) : (
        <View className="w-full gap-3">
          <Notice tone="danger">{video.error ? video.error.message : "This video was deleted."}</Notice>
          <Button label="Back" variant="secondary" size="input" onPress={() => router.back()} />
        </View>
      )}
    </SafeAreaView>
  );
}
