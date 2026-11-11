import { router } from "expo-router";
import { useState } from "react";
import { Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorNotice } from "@/components/ui/ErrorNotice";
import { Input } from "@/components/ui/Input";
import { KeyboardScrollView } from "@/components/ui/KeyboardScrollView";
import { ModuleHeader } from "@/components/ui/ModuleHeader";
import { Notice } from "@/components/ui/Notice";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { Skeleton } from "@/components/ui/Skeleton";
import { errorText } from "@/lib/errors";
import { checkMasterPassword } from "@/lib/master-password";
import { useSecureScreen } from "@/lib/secure-screen";
import {
  checkRecoveryEmail,
  checkRecoveryKey,
  sendRecoveryEmail,
  useFinishRecovery,
  useVaultSettings,
} from "@/lib/vault";

type Step = "email" | "key" | "password";

/** "y•••@gmail.com", so the screen does not show the whole address. */
function hideEmail(email: string): string {
  const [name, domain] = email.split("@");
  return domain ? `${name.charAt(0)}•••@${domain}` : email;
}

/**
 * Forgot master password, in 3 steps: a code to your sign-in email proves the account, the recovery
 * key opens the vault, and you choose a new master password. The email code alone opens nothing.
 */
export default function RecoverVaultScreen() {
  useSecureScreen("vault-recover");
  const settings = useVaultSettings();
  const finish = useFinishRecovery();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState<string | null>(null);
  const [emailCode, setEmailCode] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [key, setKey] = useState<Uint8Array | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  async function run(work: () => Promise<void>) {
    setBusy(true);
    setProblem(null);
    try {
      await work();
    } catch (error) {
      setProblem(error instanceof Error ? errorText(error) : "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const stepNumber = step === "email" ? 1 : step === "key" ? 2 : 3;

  if (settings.isPending) {
    return (
      <SafeAreaView edges={["top"]} className="flex-1 bg-surface-page">
        <ModuleHeader title="Forgot master password" tone="records" />
        <Skeleton layout="detail" />
      </SafeAreaView>
    );
  }

  if (!settings.data?.recovery_wrap) {
    return (
      <SafeAreaView edges={["top"]} className="flex-1 bg-surface-page">
        <ModuleHeader title="Forgot master password" tone="records" />
        <EmptyState
          drawing="box"
          title="This vault has no recovery key"
          body="Without the master password or a recovery key, nobody can open it, not even the server."
        />
      </SafeAreaView>
    );
  }

  const vault = settings.data;

  return (
    <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-surface-page">
      <ModuleHeader title="Forgot master password" subtitle={`Step ${stepNumber} of 3`} tone="records" />
      <KeyboardScrollView contentContainerClassName="gap-4 px-5 pb-8 pt-4">
        {step === "email" ? (
          <>
            <Text className="font-sans text-body text-ink">
              First I send a code to your sign-in email, to prove this is your account.
            </Text>
            {email ? (
              <>
                <Notice tone="neutral">I sent a code to {hideEmail(email)}.</Notice>
                <Input
                  label="Code from the email"
                  value={emailCode}
                  onChangeText={setEmailCode}
                  keyboardType="number-pad"
                  textContentType="oneTimeCode"
                  autoFocus
                />
                <Button
                  label="Check code"
                  loading={busy}
                  disabled={emailCode.trim().length < 6}
                  onPress={() =>
                    run(async () => {
                      await checkRecoveryEmail(email, emailCode);
                      setStep("key");
                    })
                  }
                />
                <Button
                  label="Send a new code"
                  variant="plain"
                  onPress={() => run(async () => setEmail(await sendRecoveryEmail()))}
                />
              </>
            ) : (
              <Button
                label="Send code"
                loading={busy}
                onPress={() => run(async () => setEmail(await sendRecoveryEmail()))}
              />
            )}
          </>
        ) : null}

        {step === "key" ? (
          <>
            <Text className="font-sans text-body text-ink">
              Type the recovery key you wrote down. Dashes and spaces do not matter.
            </Text>
            <Input
              label="Recovery key"
              value={recoveryCode}
              onChangeText={setRecoveryCode}
              autoCapitalize="characters"
              autoCorrect={false}
              autoFocus
            />
            <Button
              label="Check recovery key"
              loading={busy}
              disabled={recoveryCode.replace(/[\s-]/g, "").length < 28}
              onPress={() =>
                run(async () => {
                  const opened = await checkRecoveryKey(recoveryCode, vault);
                  if (!opened) throw new Error("That recovery key does not open this vault.");
                  setKey(opened);
                  setRecoveryCode("");
                  setStep("password");
                })
              }
            />
          </>
        ) : null}

        {step === "password" && key ? (
          <>
            <Text className="font-sans text-body text-ink">
              Choose a new master password. Your recovery key keeps working.
            </Text>
            <PasswordInput
              label="New master password"
              emphasis
              value={password}
              onChangeText={setPassword}
              textContentType="newPassword"
            />
            <PasswordInput
              label="Confirm new master password"
              value={confirm}
              onChangeText={setConfirm}
              textContentType="newPassword"
            />
            <Button
              label="Save and open the vault"
              loading={finish.isPending}
              disabled={!password}
              onPress={() => {
                const weak = checkMasterPassword(password);
                if (weak) return setProblem(weak);
                if (confirm !== password) return setProblem("The passwords do not match.");
                setProblem(null);
                finish.mutate({ key, password }, { onSuccess: () => router.replace("/vault") });
              }}
            />
            {finish.error ? <ErrorNotice error={finish.error} /> : null}
          </>
        ) : null}

        {problem ? <Notice tone="danger">{problem}</Notice> : null}
      </KeyboardScrollView>
    </SafeAreaView>
  );
}
