import { Text, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { friendlyError, type ErrorMessages } from "@/lib/errors";
import { useModuleFilter } from "@/lib/features";
import { supabase } from "@/lib/supabase";

type ErrorNoticeProps = {
  error: unknown;
  /** What failed, such as "Could not load your debts." */
  lead?: string;
  /** Shows Try again when the error can pass on a second try. */
  onRetry?: () => void;
  /** A screen's own words for a code, such as a duplicate name. */
  messages?: ErrorMessages;
};

/**
 * A danger notice with a plain sentence for any error, never the Supabase text. The admin also
 * sees the code, so a screenshot tells the cause.
 */
export function ErrorNotice({ error, lead, onRetry, messages }: ErrorNoticeProps) {
  const { isAdmin } = useModuleFilter();
  const { text, action, code } = friendlyError(error, messages);
  return (
    <View className="gap-2">
      <Notice tone="danger">
        {lead ? `${lead} ${text}` : text}
        {isAdmin && code ? <Text className="font-semibold">{`\nCode ${code}`}</Text> : null}
      </Notice>
      {action === "retry" && onRetry ? (
        <Button label="Try again" variant="secondary" size="input" onPress={onRetry} />
      ) : null}
      {action === "signIn" ? (
        <Button label="Sign in again" variant="secondary" size="input" onPress={() => void supabase.auth.signOut()} />
      ) : null}
    </View>
  );
}
