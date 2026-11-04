import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Notice } from "@/components/ui/Notice";
import { Sheet } from "@/components/ui/Sheet";
import { useSaveExchangeRate } from "@/lib/money";

type ExchangeRateSheetProps = {
  visible: boolean;
  onClose: () => void;
  currency: string;
  rate: number | null;
};

type FieldsProps = Omit<ExchangeRateSheetProps, "visible">;

function ExchangeRateFields({ onClose, currency, rate }: FieldsProps) {
  const save = useSaveExchangeRate();
  const [text, setText] = useState(rate === null ? "" : String(rate));
  const [error, setError] = useState<string | undefined>();

  async function onSave() {
    const clean = text.replace(/[,\s]/g, "");
    const value = /^\d+(\.\d{1,4})?$/.test(clean) ? Number(clean) : 0;
    if (value <= 0) {
      setError("Enter a rate, such as 58.25.");
      return;
    }
    await save.mutateAsync({ currency, rateToPhp: value });
    onClose();
  }

  return (
    <>
      <Input
        label={`1 ${currency} in ₱`}
        value={text}
        onChangeText={(value) => {
          setText(value);
          setError(undefined);
        }}
        placeholder="58.25"
        inputMode="decimal"
        keyboardType="decimal-pad"
        autoFocus
        error={error}
      />
      {save.error ? <Notice tone="danger">{save.error.message}</Notice> : null}
      <Button label="Save rate" loading={save.isPending} onPress={onSave} />
    </>
  );
}

/** One field: the rate you use to convert a foreign subscription to pesos. */
export function ExchangeRateSheet({ visible, ...props }: ExchangeRateSheetProps) {
  return (
    <Sheet
      visible={visible}
      onClose={props.onClose}
      title={`${props.currency} rate`}
      subtitle="Use the rate your bank or card charges you."
    >
      {visible ? <ExchangeRateFields {...props} /> : null}
    </Sheet>
  );
}
