import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useState, type ReactNode } from "react";
import { Text, View } from "react-native";
import Animated, { FadeInDown, SlideInRight, SlideOutLeft } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/ui/Button";
import { HabiMark } from "@/components/ui/HabiMark";
import { Input } from "@/components/ui/Input";
import { KeyboardAvoidingView } from "@/components/ui/KeyboardAvoidingView";
import { KeyboardScrollView } from "@/components/ui/KeyboardScrollView";
import { StitchStrip, WeaveField } from "@/components/ui/WeaveField";
import { useColors } from "@/lib/colors";
import { signInWithGoogle } from "@/lib/google-sign-in";
import { motion, useReduceMotion } from "@/lib/motion";
import { supabase } from "@/lib/supabase";

type Busy = "google" | "send" | "verify" | null;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong. Try again.";
}

/** The headline rises line by line when login opens. */
function Rise({ order, children }: { order: number; children: ReactNode }) {
  const reduced = useReduceMotion();
  return (
    <Animated.View entering={reduced ? undefined : FadeInDown.duration(motion.riseIn).delay(order * motion.fade)}>
      {children}
    </Animated.View>
  );
}

/** A sign-in error on the shell: a magenta edge and cream text. */
function ShellError({ text }: { text: string }) {
  return (
    <Text
      accessibilityRole="alert"
      className="rounded-input border-2 border-over-fill bg-over-fill/20 p-3 font-sans text-label text-on-shell"
    >
      {text}
    </Text>
  );
}

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const reduced = useReduceMotion();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(kind: Exclude<Busy, null>, action: () => Promise<void>) {
    setBusy(kind);
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  const onGoogle = () =>
    run("google", async () => {
      await signInWithGoogle();
    });

  const sendCode = async () => {
    const { error: sendError } = await supabase.auth.signInWithOtp({ email: email.trim() });
    if (sendError) throw sendError;
    setCodeSent(true);
  };
  const onSendCode = () => run("send", sendCode);

  const onVerifyCode = () =>
    run("verify", async () => {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: code.trim(),
        type: "email",
      });
      if (verifyError) throw verifyError;
    });

  const step = reduced
    ? {}
    : { entering: SlideInRight.duration(motion.pushIn), exiting: SlideOutLeft.duration(motion.pushOut) };

  return (
    <View className="flex-1 bg-shell">
      <StatusBar style="light" />
      <KeyboardAvoidingView className="flex-1">
        <WeaveField fill className="flex-1" paddingTop={insets.top}>
          <KeyboardScrollView
            contentContainerClassName="min-h-full justify-between gap-8 px-6 pb-6 pt-8"
            keyboardShouldPersistTaps="handled"
          >
            <View className="gap-6">
              <View className="flex-row items-center gap-3">
                <HabiMark size={40} tone="reverse" label={false} />
                <Text accessibilityRole="header" className="font-bold text-title text-on-shell">
                  Habi
                </Text>
              </View>
              {codeSent ? null : (
                <View className="gap-4">
                  <Rise order={0}>
                    <Text className="font-bold text-say text-on-shell">
                      One private app that tells you what needs you today.
                    </Text>
                  </Rise>
                  <Rise order={1}>
                    <Text className="font-sans text-label text-on-shell-muted">
                      <Text className="font-bold text-gold">Habi</Text> is Tagalog for “weave”.
                    </Text>
                  </Rise>
                </View>
              )}
            </View>

            {codeSent ? (
              <Animated.View key="code" {...step}>
                <View className="gap-4">
                  <View className="gap-2">
                    <Text accessibilityRole="header" className="font-bold text-title-lg text-on-shell">
                      Check your email.
                    </Text>
                    <Text className="font-sans text-body text-on-shell-muted">
                      I sent an 8-digit code to {email.trim()}.
                    </Text>
                  </View>
                  {error ? <ShellError text={error} /> : null}
                  <Input
                    tone="shell"
                    label="Code from the email"
                    value={code}
                    onChangeText={setCode}
                    placeholder="12345678"
                    keyboardType="number-pad"
                    autoComplete="one-time-code"
                    // The live project sends 8 digits (Auth › otp_length); 6 to 8 keeps working if it changes.
                    maxLength={8}
                  />
                  <Button
                    label="Verify code"
                    variant="cream"
                    loading={busy === "verify"}
                    disabled={busy !== null || !/^\d{6,8}$/.test(code.trim())}
                    onPress={onVerifyCode}
                  />
                  <Button
                    label={error ? "Send a new code" : "Use a different email"}
                    variant="ghost"
                    size="input"
                    loading={busy === "send"}
                    disabled={busy !== null}
                    onPress={() => {
                      if (error) {
                        setCode("");
                        void onSendCode();
                        return;
                      }
                      setCodeSent(false);
                      setCode("");
                    }}
                  />
                </View>
              </Animated.View>
            ) : (
              <Animated.View key="start" {...step}>
                <View className="gap-4">
                  <Button
                    label={busy === "google" ? "Opening Google…" : "Continue with Google"}
                    variant="cream"
                    icon={<Ionicons name="logo-google" size={20} color={colors.shell} />}
                    loading={busy === "google"}
                    disabled={busy !== null}
                    onPress={onGoogle}
                  />

                  <View className="flex-row items-center gap-3">
                    <View className="h-0.5 flex-1 bg-on-shell/25" />
                    <Text className="font-sans text-caption text-on-shell-muted">or</Text>
                    <View className="h-0.5 flex-1 bg-on-shell/25" />
                  </View>

                  {error ? <ShellError text={error} /> : null}
                  <Input
                    tone="shell"
                    label="Email"
                    value={email}
                    onChangeText={setEmail}
                    placeholder="you@example.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    editable={busy === null}
                  />
                  <Button
                    label="Email me a code"
                    variant="ghost"
                    size="input"
                    loading={busy === "send"}
                    disabled={busy !== null || !email.includes("@")}
                    onPress={onSendCode}
                  />
                  <Text className="mt-2 text-center font-sans text-caption text-on-shell-muted">
                    Private app. Ask the admin for an account.
                  </Text>
                </View>
              </Animated.View>
            )}
          </KeyboardScrollView>
        </WeaveField>
        <View style={{ paddingBottom: insets.bottom }} className="bg-shell">
          <StitchStrip />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
