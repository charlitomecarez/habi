import { useNavigation, usePreventRemove } from "expo-router";
import { useRef, useState, type ReactNode } from "react";

import { ConfirmSheet } from "@/components/ui/ConfirmSheet";

type Action = Parameters<NonNullable<Parameters<typeof usePreventRemove>[1]>>[0]["data"]["action"];

/**
 * Stops a back, a drag back or a drag down while a form has unsaved changes, and asks first.
 * Call `allowLeave()` before the form closes itself after a save or a delete.
 */
export function useDiscardGuard(dirty: boolean, body: string): { sheet: ReactNode; allowLeave: () => void } {
  const navigation = useNavigation();
  const allowed = useRef(false);
  const [pending, setPending] = useState<Action | null>(null);

  usePreventRemove(dirty, ({ data }) => {
    // A save or a delete closes the form in the same tick, before the guard turns off.
    if (allowed.current) navigation.dispatch(data.action);
    else setPending(data.action);
  });

  const sheet = (
    <ConfirmSheet
      visible={pending !== null}
      title="Discard your changes?"
      body={body}
      confirmLabel="Discard changes"
      cancelLabel="Keep editing"
      onClose={() => setPending(null)}
      onConfirm={() => {
        const action = pending;
        allowed.current = true;
        setPending(null);
        if (action) navigation.dispatch(action);
      }}
    />
  );

  return {
    sheet,
    allowLeave: () => {
      allowed.current = true;
    },
  };
}
