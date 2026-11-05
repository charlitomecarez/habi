import { useState } from "react";
import { Text, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Notice } from "@/components/ui/Notice";
import { Sheet } from "@/components/ui/Sheet";
import { useCreatePairCode, useRedeemPairCode } from "@/lib/voice";

type SheetProps = { visible: boolean; onClose: () => void };

/** Shows a one-time code for the other phone. */
export function MakeCodeSheet({ visible, onClose }: SheetProps) {
  const create = useCreatePairCode();
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Make a pairing code"
      subtitle="Type this code on the other phone. It works once, for 15 minutes."
    >
      <View className="gap-4 px-5 pb-5 pt-4">
        {create.error ? <Notice tone="danger">{create.error.message}</Notice> : null}
        {create.data ? (
          <Text selectable className="text-center font-bold text-title-lg text-ink">
            {create.data}
          </Text>
        ) : null}
        <Button
          label={create.data ? "Make a new code" : "Make code"}
          loading={create.isPending}
          onPress={() => create.mutate()}
        />
      </View>
    </Sheet>
  );
}

/** Takes the code from the other phone. Pairing connects voice messages and nothing else. */
export function EnterCodeSheet({ visible, onClose }: SheetProps) {
  const redeem = useRedeemPairCode();
  const [code, setCode] = useState("");
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Enter a pairing code"
      subtitle="This connects voice messages only. Your other data stays separate."
    >
      <View className="gap-4 px-5 pb-5 pt-4">
        {redeem.error ? <Notice tone="danger">{redeem.error.message}</Notice> : null}
        <Input label="Code" value={code} onChangeText={setCode} autoCapitalize="characters" autoCorrect={false} />
        <Button
          label="Pair accounts"
          loading={redeem.isPending}
          disabled={code.trim().length === 0}
          onPress={() => redeem.mutate(code, { onSuccess: onClose })}
        />
      </View>
    </Sheet>
  );
}
