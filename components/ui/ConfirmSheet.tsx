import { Text } from "react-native";

import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";

type ConfirmSheetProps = {
  visible: boolean;
  /** The question, such as "Delete this debt?" */
  title: string;
  /** What else happens, in one or two sentences. */
  body?: string;
  /** The destructive action, such as "Delete debt". */
  confirmLabel: string;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

/** A destructive choice in a bottom sheet, so every choice in the app opens the same way. Back and the scrim cancel. */
export function ConfirmSheet({ visible, title, body, confirmLabel, loading, onConfirm, onClose }: ConfirmSheetProps) {
  return (
    <Sheet visible={visible} onClose={onClose} title={title}>
      {body ? <Text className="font-sans text-body text-ink">{body}</Text> : null}
      <Button label={confirmLabel} variant="destructive" loading={loading} onPress={onConfirm} />
      <Button label="Cancel" variant="secondary" onPress={onClose} />
    </Sheet>
  );
}
