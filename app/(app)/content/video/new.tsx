import { useLocalSearchParams } from "expo-router";

import { VideoForm } from "@/components/content/VideoForm";

export default function NewVideoScreen() {
  const { stage } = useLocalSearchParams<{ stage?: string }>();
  return <VideoForm stage={stage === "idea" ? "idea" : "script"} />;
}
