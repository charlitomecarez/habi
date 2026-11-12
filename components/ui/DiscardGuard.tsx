import { usePreventRemove } from "expo-router";
import { useRef, useState, type ReactNode } from "react";

import { ConfirmSheet } from "@/components/ui/ConfirmSheet";

/**
 * Stops a back, a drag back or a drag down while a form has unsaved changes, and asks first.
 * Call `allowLeave()` before the form closes itself after a save or a delete.
 */
export function useDiscardGuard(dirty: boolean, body: string): { sheet: ReactNode; allowLeave: () => void } {
  const allowed = useRef(false);
  // `repeat` turns the guard off and runs the blocked back again. A plain dispatch is blocked again.
  const [pending, setPending] = useState<{ repeat: () => void } | null>(null);

  const disable = usePreventRemove(dirty, ({ repeat }) => {
    if (allowed.current) repeat();
    else setPending({ repeat });
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
        allowed.current = true;
        setPending(null);
        pending?.repeat();
      }}
    />
  );

  return {
    sheet,
    allowLeave: () => {
      allowed.current = true;
      disable();
    },
  };
}
