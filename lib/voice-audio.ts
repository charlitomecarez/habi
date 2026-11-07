import { RecordingPresets, useAudioPlayer, useAudioPlayerStatus, type RecordingOptions } from "expo-audio";
import { useEffect, useState } from "react";

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

/** A load that shows no sound after this long counts as failed. */
const LOAD_TIMEOUT_MS = 10_000;

export type AudioState = "ready" | "loading" | "playing" | "failed";

export type AudioView = {
  state: AudioState;
  /** Seconds played and in total, while this message is playing. */
  position: number;
  duration: number;
};

/** One player for a whole list. Plays a stored message from a short-lived signed URL. */
export function useVoicePlayer() {
  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);
  const [current, setCurrent] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);

  useEffect(() => {
    const subscription = player.addListener("playbackStatusUpdate", (update) => {
      if (update.playing) setLoading(null);
    });
    return () => subscription.remove();
  }, [player]);

  useEffect(() => {
    if (!loading) return;
    // The player reports no load error, so silence after the limit is the failure.
    const timer = setTimeout(() => {
      player.pause();
      setFailed(loading);
      setLoading(null);
      setCurrent(null);
    }, LOAD_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [loading, player]);

  async function toggle(path: string) {
    setFailed(null);
    if (current === path && status.playing) {
      player.pause();
      return;
    }
    if (current === path && !loading) {
      // At the end of the audio, play starts again from the top.
      if (status.duration > 0 && status.currentTime >= status.duration - 0.2) await player.seekTo(0);
      player.play();
      return;
    }
    setLoading(path);
    const { data, error } = await supabase.storage.from(VOICE_BUCKET).createSignedUrl(path, SIGNED_URL_SECONDS);
    if (error) {
      setLoading(null);
      setFailed(path);
      return;
    }
    player.replace({ uri: data.signedUrl });
    setCurrent(path);
    player.play();
  }

  function view(path: string | null): AudioView {
    const here = path !== null && path === current;
    let state: AudioState = "ready";
    if (path !== null && path === failed) state = "failed";
    else if (path !== null && path === loading) state = "loading";
    else if (here && status.playing) state = "playing";
    return { state, position: here ? status.currentTime : 0, duration: here ? status.duration : 0 };
  }

  return { toggle, view };
}
