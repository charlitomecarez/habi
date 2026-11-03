import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { KeyboardAvoidingView, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { signInWithGoogle } from "@/lib/google-sign-in";
import { supabase } from "@/lib/supabase";

type Busy = "google" | "send" | "verify" | null;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong. Try again.";
}

export default function LoginScreen() {
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

  const onSendCode = () =>
    run("send", async () => {
      const { error: sendError } = await supabase.auth.signInWithOtp({ email: email.trim() });
      if (sendError) throw sendError;
      setCodeSent(true);
    });

  const onVerifyCode = () =>
    run("verify", async () => {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: code.trim(),
        type: "email",
      });
      if (verifyError) throw verifyError;
    });

  return (
    <SafeAreaView className="flex-1 bg-surface-page">
      <KeyboardAvoidingView behavior="padding" className="flex-1">
        <ScrollView
          contentContainerClassName="min-h-full justify-between gap-8 px-6 pb-8 pt-16"
          keyboardShouldPersistTaps="handled"
        >
          <View className="gap-5">
            <View className="h-14 w-14 items-center justify-center rounded-card bg-accent">
              <Ionicons name="grid-outline" size={28} color="#FFFFFF" accessibilityElementsHidden />
            </View>
            <View className="gap-2">
              <Text accessibilityRole="header" className="font-bold text-display text-ink">
                my-app
              </Text>
              <Text className="font-sans text-body text-ink-muted">
                Todos, your bike, your room and your passwords, in one place.
              </Text>
            </View>
          </View>

          <View className="gap-4">
            <Button
              label="Continue with Google"
              variant="secondary"
              icon={<Ionicons name="logo-google" size={20} color="#1A1C1E" />}
              loading={busy === "google"}
              disabled={busy !== null}
              onPress={onGoogle}
            />

            <View className="flex-row items-center gap-3">
              <View className="h-px flex-1 bg-border-input" />
              <Text className="font-sans text-caption text-ink-muted">or</Text>
              <View className="h-px flex-1 bg-border-input" />
            </View>

            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              editable={!codeSent}
            />

            {codeSent ? (
              <>
                <Input
                  label="6-digit code"
                  value={code}
                  onChangeText={setCode}
                  placeholder="123456"
                  keyboardType="number-pad"
                  autoComplete="one-time-code"
                  maxLength={6}
                />
                <Button
                  label="Verify code"
                  size="input"
                  loading={busy === "verify"}
                  disabled={busy !== null || code.trim().length !== 6}
                  onPress={onVerifyCode}
                />
                <Button
                  label="Use a different email"
                  variant="secondary"
                  size="input"
                  disabled={busy !== null}
                  onPress={() => {
                    setCodeSent(false);
                    setCode("");
                  }}
                />
              </>
            ) : (
              <Button
                label="Email me a code"
                size="input"
                loading={busy === "send"}
                disabled={busy !== null || !email.includes("@")}
                onPress={onSendCode}
              />
            )}

            {error ? (
              <Text accessibilityRole="alert" className="rounded-md bg-danger-tint p-3 font-sans text-caption text-danger">
                {error}
              </Text>
            ) : null}

            <Text className="mt-2 text-center font-sans text-caption text-ink-muted">
              Private app. Only your account can sign in.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
