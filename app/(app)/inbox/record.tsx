import { Ionicons } from "@expo/vector-icons";
import {
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import { useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { Select } from "@/components/ui/Select";
import { goBack } from "@/lib/navigation";
import { useColors } from "@/lib/colors";
import {
  durationText,
  MAX_RECORD_SECONDS,
  newRecordingId,
  useSendVoice,
  type Recording,
  useVoiceAccess,
} from "@/lib/voice";
import { VOICE_RECORDING } from "@/lib/voice-audio";

type Stage = "starting" | "recording" | "stopped" | "denied";

export default function RecordScreen() {
  const colors = useColors();
  const recorder = useAudioRecorder(VOICE_RECORDING);
  const state = useAudioRecorderState(recorder, 250);
  const send = useSendVoice();
  const access = useVoiceAccess();
  const [stage, setStage] = useState<Stage>("starting");
  const [startError, setStartError] = useState<string | null>(null);
  const [recording, setRecording] = useState<Recording | null>(null);
  const finishing = useRef(false);

  const [picked, setPicked] = useState<string | null>(null);

  const seconds = Math.floor(state.durationMillis / 1000);
  const contacts = access.data?.contacts ?? [];
  // With more than one contact you must choose, so a private message cannot go to the wrong person.
  const recipientId = contacts.length === 1 ? contacts[0].user_id : picked;

  // Recording starts at once, so sending a message takes as few taps as possible.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { granted } = await requestRecordingPermissionsAsync();
      if (cancelled) return;
      if (!granted) {
        setStage("denied");
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      if (cancelled) return;
      recorder.record();
      setStage("recording");
    })().catch((error: unknown) => {
      setStartError(error instanceof Error ? error.message : "Could not start the microphone.");
    });
    return () => {
      cancelled = true;
      void setAudioModeAsync({ allowsRecording: false });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function sendNow(next: Recording) {
    if (recipientId) send.mutate({ ...next, recipientId }, { onSuccess: () => goBack() });
  }

  async function stopRecording(): Promise<Recording | null> {
    if (finishing.current) return null;
    finishing.current = true;
    const durationS = Math.min(MAX_RECORD_SECONDS, Math.max(1, Math.round(recorder.getStatus().durationMillis / 1000)));
    await recorder.stop();
    setStage("stopped");
    if (!recorder.uri) {
      setStartError("The recording was not saved. Record again.");
      return null;
    }
    const next = { id: newRecordingId(), uri: recorder.uri, durationS };
    setRecording(next);
    return next;
  }

  async function stopAndSend() {
    const next = await stopRecording();
    if (next) sendNow(next);
  }

  // Five minutes is the limit. The recording stops, and you tap Send.
  useEffect(() => {
    if (stage !== "recording") return;
    const timer = setTimeout(() => void stopRecording(), MAX_RECORD_SECONDS * 1000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  async function cancel() {
    if (stage === "recording") await recorder.stop().catch(() => undefined);
    goBack();
  }

  return (
    <SafeAreaView className="flex-1 bg-surface-page">
      <View className="flex-row items-center gap-1 px-3 pb-2 pt-2">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cancel and close"
          onPress={() => void cancel()}
          className="h-touch w-touch items-center justify-center"
        >
          <Ionicons name="close" size={22} color={colors.ink} />
        </Pressable>
        <Text accessibilityRole="header" className="font-bold text-title text-ink">
          Voice message
        </Text>
      </View>

      <View className="flex-1 items-center justify-center gap-5 px-5">
        <Text className="text-center font-sans text-label text-ink-muted">
          Your message arrives as text. An outside service makes the text.
        </Text>
        {contacts.length > 1 ? (
          <View className="w-full">
            <Select
              label="Send to"
              options={contacts.map((c) => ({ value: c.user_id, label: c.name }))}
              value={picked}
              onChange={setPicked}
            />
          </View>
        ) : null}
        <Text className="font-bold text-title-lg text-ink">{durationText(seconds)}</Text>
        <View className="h-button w-button items-center justify-center rounded-pill bg-danger-tint">
          <Ionicons name="mic" size={28} color={colors.danger} />
        </View>
        <Text className="font-sans text-caption text-ink-muted">
          {stage === "recording" ? "Recording. Up to 5 minutes." : stage === "starting" ? "Starting" : "Stopped"}
        </Text>
        {stage === "denied" ? (
          <Notice tone="warning">Allow the microphone for my-app in your phone settings, then try again.</Notice>
        ) : null}
        {startError ? <Notice tone="danger">{startError}</Notice> : null}
        {send.error ? <Notice tone="danger">Could not send. {send.error.message}</Notice> : null}
      </View>

      <View className="px-5 pb-5">
        {recording ? (
          <Button
            label={send.error ? "Send again" : "Send"}
            loading={send.isPending}
            disabled={!recipientId}
            onPress={() => sendNow(recording)}
          />
        ) : (
          <Button
            label="Stop and send"
            disabled={stage !== "recording" || !recipientId}
            onPress={() => void stopAndSend()}
          />
        )}
      </View>
    </SafeAreaView>
  );
}
