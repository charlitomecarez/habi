import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Notice } from "@/components/ui/Notice";
import { Sheet } from "@/components/ui/Sheet";
import { amountText, parseBalance, useSaveAccount, type Account } from "@/lib/money";

type AccountSheetProps = {
  visible: boolean;
  onClose: () => void;
  /** The account to edit. Without it, the sheet adds a new account. */
  account: Account | null;
};

type FieldsProps = Omit<AccountSheetProps, "visible">;

/** Mounted each time the sheet opens, so its fields start from the account. */
function AccountFields({ onClose, account }: FieldsProps) {
  const save = useSaveAccount();
  const [name, setName] = useState(account?.name ?? "");
  const [opening, setOpening] = useState(amountText(account?.opening_balance ?? 0));
  const [errors, setErrors] = useState<{ name?: string; opening?: string }>({});

  async function onSave() {
    const trimmed = name.trim();
    const openingBalance = parseBalance(opening);
    const next = {
      name: trimmed ? undefined : "Enter a name.",
      opening: openingBalance === null ? "Enter an amount, such as 1500.00." : undefined,
    };
    setErrors(next);
    if (next.name || next.opening || openingBalance === null) return;
    await save.mutateAsync({ id: account?.id, name: trimmed, openingBalance });
    onClose();
  }

  return (
    <>
      <Input
        label="Name"
        value={name}
        onChangeText={(text) => {
          setName(text);
          setErrors((e) => ({ ...e, name: undefined }));
        }}
        placeholder="Maya"
        maxLength={60}
        error={errors.name}
      />
      <Input
        label="Opening balance (₱)"
        value={opening}
        onChangeText={(text) => {
          setOpening(text);
          setErrors((e) => ({ ...e, opening: undefined }));
        }}
        inputMode="decimal"
        keyboardType="decimal-pad"
        error={errors.opening}
      />
      {save.error ? <Notice tone="danger">{save.error.message}</Notice> : null}
      <Button label={account ? "Save account" : "Add account"} loading={save.isPending} onPress={onSave} />
    </>
  );
}

/**
 * Two fields, so a sheet. The balance is the opening balance plus every
 * transaction, so set the opening balance to the real balance on the day
 * you start logging.
 */
export function AccountSheet({ visible, ...props }: AccountSheetProps) {
  return (
    <Sheet
      visible={visible}
      onClose={props.onClose}
      title={props.account ? "Edit account" : "Add account"}
      subtitle="Opening balance is what the account held before your first logged transaction."
    >
      {visible ? <AccountFields {...props} /> : null}
    </Sheet>
  );
}
