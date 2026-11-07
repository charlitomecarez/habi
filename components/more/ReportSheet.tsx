import { useState } from "react";
import { Text } from "react-native";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Notice } from "@/components/ui/Notice";
import { Segmented } from "@/components/ui/Segmented";
import { Sheet } from "@/components/ui/Sheet";
import { useSendReport, type ReportKind } from "@/lib/feedback";

const KINDS = [
  { value: "bug", label: "Bug" },
  { value: "idea", label: "Idea" },
] as const;

export function ReportSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const send = useSendReport();
  const [kind, setKind] = useState<ReportKind>("bug");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  function close() {
    setKind("bug");
    setMessage("");
    setSent(false);
    send.reset();
    onClose();
  }

  if (sent) {
    return (
      <Sheet visible={visible} onClose={close} title="Report sent">
        <Text className="font-sans text-body text-ink-muted">
          The admin reads each report. You do not get a reply in the app.
        </Text>
        <Button label="Done" onPress={close} />
      </Sheet>
    );
  }

  return (
    <Sheet
      visible={visible}
      onClose={close}
      title="Report a bug"
      subtitle="Your message goes to the admin. The app adds its version and your phone model."
    >
      <Segmented label="Type" options={KINDS} value={kind} onChange={setKind} />
      <Input
        label="What happened"
        value={message}
        onChangeText={setMessage}
        multiline
        maxLength={2000}
        placeholder="The Vehicle tab shows the old odometer after I save."
      />
      {send.error ? (
        <Notice tone="danger">Could not send. Your message stays here. Check your connection.</Notice>
      ) : null}
      <Button
        label="Send report"
        loading={send.isPending}
        disabled={!message.trim()}
        onPress={() => send.mutate({ kind, message: message.trim() }, { onSuccess: () => setSent(true) })}
      />
    </Sheet>
  );
}
