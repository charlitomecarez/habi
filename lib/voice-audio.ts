import { RecordingPresets, useAudioPlayer, useAudioPlayerStatus, type RecordingOptions } from "expo-audio";
import { useState } from "react";

import { supabase } from "@/lib/supabase";
import { VOICE_BUCKET } from "@/lib/voice";

const SIGNED_URL_SECONDS = 60 * 60;

/** Mono at 64 kbps: 5 minutes is about 2.4 MB, inside the 5 MB bucket limit. */
export const VOICE_RECORDING: RecordingOptions = {
  ...RecordingPresets.HIGH_QUALITY,
  numberOfChannels: 1,
  bitRate: 64000,
  web: { mimeType: "audio/webm", bitsPerSecond: 64000 },
};

/** One player for a whole list. Plays a stored message from a short-lived signed URL. */
export function useVoicePlayer() {
  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);
  const [current, setCurrent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggle(path: string) {
    setError(null);
    if (current === path && status.playing) {
      player.pause();
      return;
    }
    if (current === path) {
      // At the end of the audio, play starts again from the top.
      if (status.duration > 0 && status.currentTime >= status.duration - 0.2) await player.seekTo(0);
      player.play();
      return;
    }
    const { data, error: urlError } = await supabase.storage
      .from(VOICE_BUCKET)
      .createSignedUrl(path, SIGNED_URL_SECONDS);
    if (urlError) {
      setError("Could not open this audio.");
      return;
    }
    player.replace({ uri: data.signedUrl });
    setCurrent(path);
    player.play();
  }

  return { toggle, error, playingPath: status.playing ? current : null };
}
