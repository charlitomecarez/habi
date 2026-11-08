import type { ReactNode } from "react";
import { SafeAreaView } from "react-native-safe-area-context";

import { EmptyState } from "@/components/ui/EmptyState";
import { ModuleHeader, type HeaderTone } from "@/components/ui/ModuleHeader";
import { useModuleFilter } from "@/lib/features";
import { ALL_MODULES, hiddenReason } from "@/lib/modules";

const NEEDS_TEXT = {
  sports: "The server has no sports keys. The setup guide in CONTRIBUTING.md says how to add them.",
  ai: "The server has no Groq key. The setup guide in CONTRIBUTING.md says how to add it.",
  tip: "The server has no Gemini key.",
  email: "The server has no Resend key.",
} as const;

/**
 * Wraps a module screen that needs a server key. When the server cannot run it, an old link or
 * shortcut shows why, with no primary action. A module you only switched off still opens.
 */
export function ModuleGate({ id, tone, children }: { id: string; tone: HeaderTone; children: ReactNode }) {
  const filter = useModuleFilter();
  const entry = ALL_MODULES.find((m) => m.id === id);
  if (!entry?.needs || hiddenReason(entry, filter) !== "server") return children;
  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-surface-page">
      <ModuleHeader title={entry.label} tone={tone} />
      <EmptyState drawing="box" title={`${entry.label} is not set up on this server`} body={NEEDS_TEXT[entry.needs]} />
    </SafeAreaView>
  );
}
