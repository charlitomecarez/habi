import { useState } from "react";
import { Text, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { ErrorNotice } from "@/components/ui/ErrorNotice";
import { Select } from "@/components/ui/Select";
import { Sheet } from "@/components/ui/Sheet";
import { formatPeso, useAccounts } from "@/lib/money";
import { useMarkPaid } from "@/lib/travel";

type Props = { visible: boolean; onClose: () => void; itemId: string; amount: number };

/** Adds one expense to Money. Account balances stay the numbers you set. */
export function MarkPaidSheet({ visible, onClose, itemId, amount }: Props) {
  const accounts = useAccounts();
  const paid = useMarkPaid();
  const [accountId, setAccountId] = useState<string | null>(null);

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Mark as paid"
      subtitle={`Adds a ${formatPeso(amount)} expense to Money.`}
    >
      <View className="gap-4 px-5 pb-5 pt-3">
        <Select
          label="Paid from"
          options={(accounts.data ?? []).map((a) => ({ value: a.id, label: a.name }))}
          value={accountId}
          onChange={setAccountId}
        />
        <Text className="font-sans text-caption text-ink-muted">It does not change the account balance.</Text>
        {paid.error ? <ErrorNotice error={paid.error} /> : null}
        <Button
          label="Add expense"
          disabled={!accountId}
          loading={paid.isPending}
          onPress={async () => {
            if (!accountId) return;
            await paid.mutateAsync({ itemId, accountId, amount });
            onClose();
          }}
        />
      </View>
    </Sheet>
  );
}
