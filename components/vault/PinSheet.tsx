import { useState } from "react";
import { Text } from "react-native";

import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { Sheet } from "@/components/ui/Sheet";
import { useSetPin } from "@/lib/vault";
import { checkPin } from "@/lib/vault-crypto";
import { MAX_PIN_TRIES } from "@/lib/vault-pin";

/** Two fields, so a sheet: the new PIN twice. The parent mounts it only while open, so it starts empty. */
export function PinSheet({ on, onClose }: { on: boolean; onClose: () => void }) {
  const setPin = useSetPin();
  const [pin, setPinText] = useState("");
  const [confirm, setConfirm] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const digits = (text: string) => text.replace(/\D/g, "").slice(0, 6);

  function onSave() {
    const weak = checkPin(pin);
    if (weak) return setProblem(weak);
    if (confirm !== pin) return setProblem("The PINs do not match.");
    setProblem(null);
    setPin.mutate(pin, { onSuccess: onClose });
  }

  return (
    <Sheet
      visible
      onClose={onClose}
      title={on ? "Change PIN" : "Turn on PIN unlock"}
      subtitle="6 digits, on this phone only."
    >
      <PasswordInput
        label="PIN"
        emphasis
        value={pin}
        onChangeText={(t) => setPinText(digits(t))}
        keyboardType="number-pad"
        maxLength={6}
        autoFocus
      />
      <PasswordInput
        label="Confirm PIN"
        value={confirm}
        onChangeText={(t) => setConfirm(digits(t))}
        keyboardType="number-pad"
        maxLength={6}
        onSubmitEditing={onSave}
      />
      <Text className="font-sans text-caption text-ink-muted">
        The PIN opens the vault on this phone. After {MAX_PIN_TRIES} wrong tries it turns off, and your master password
        is needed. It never leaves this phone.
      </Text>
      {problem ? <Notice tone="danger">{problem}</Notice> : null}
      {setPin.error ? <Notice tone="danger">{setPin.error.message}</Notice> : null}
      <Button label="Save PIN" loading={setPin.isPending} disabled={pin.length < 6} onPress={onSave} />
      {on ? (
        <Button
          label="Turn off PIN unlock"
          variant="secondary"
          size="input"
          loading={setPin.isPending}
          onPress={() => setPin.mutate(null, { onSuccess: onClose })}
        />
      ) : null}
    </Sheet>
  );
}
