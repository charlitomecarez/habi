import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { KeyboardAvoidingView } from "@/components/ui/KeyboardAvoidingView";
import { KeyboardScrollView } from "@/components/ui/KeyboardScrollView";
import { useColors } from "@/lib/colors";
import { signInWithGoogle } from "@/lib/google-sign-in";
import { supabase } from "@/lib/supabase";

type Busy = "google" | "send" | "verify" | null;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong. Try again.";
}

export default function LoginScreen() {
  const colors = useColors();
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
      <KeyboardAvoidingView className="flex-1">
        <KeyboardScrollView
          contentContainerClassName="min-h-full justify-between gap-8 px-6 pb-8 pt-slot"
          keyboardShouldPersistTaps="handled"
        >
          <View className="gap-5">
            <View className="h-slot w-slot items-center justify-center rounded-card bg-accent">
              <Ionicons name="grid-outline" size={28} color={colors.onAccent} accessibilityElementsHidden />
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
              icon={<Ionicons name="logo-google" size={20} color={colors.ink} />}
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
                  size="input"
                  loading={busy === "verify"}
                  disabled={busy !== null || !/^\d{6,8}$/.test(code.trim())}
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
              <Text
                accessibilityRole="alert"
                className="rounded-md bg-danger-tint p-3 font-sans text-caption text-danger"
              >
                {error}
              </Text>
            ) : null}

            <Text className="mt-2 text-center font-sans text-caption text-ink-muted">
              Private app. Only your account can sign in.
            </Text>
          </View>
        </KeyboardScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
