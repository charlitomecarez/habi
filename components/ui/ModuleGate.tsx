import type { ReactNode } from "react";
import { SafeAreaView } from "react-native-safe-area-context";

import { EmptyState } from "@/components/ui/EmptyState";
import { ModuleHeader, type HeaderTone } from "@/components/ui/ModuleHeader";
import { useModuleFilter } from "@/lib/features";
import { ALL_MODULES, hiddenReason, type Feature } from "@/lib/modules";

const NEEDS_TEXT = {
  sports: "The server has no sports keys. The setup guide in CONTRIBUTING.md says how to add them.",
  ai: "The server has no Groq key. The setup guide in CONTRIBUTING.md says how to add it.",
  tip: "The server has no Gemini key.",
  email: "The server has no Resend key.",
  movies: "The server has no TMDB key. The setup guide in CONTRIBUTING.md says how to add it.",
  places: "The server has no Geoapify key. The setup guide in CONTRIBUTING.md says how to add it.",
} as const;

/**
 * Wraps a module screen that needs a server key. When the server cannot run it, an old link or
 * shortcut shows why, with no primary action. A module you only switched off still opens.
 * A screen inside a module that needs its own key, such as Places near you, passes `needs` and `title`.
 */
export function ModuleGate({
  id,
  tone,
  children,
  needs,
  title,
}: {
  id: string;
  tone: HeaderTone;
  children: ReactNode;
  needs?: Feature;
  title?: string;
}) {
  const filter = useModuleFilter();
  const entry = ALL_MODULES.find((m) => m.id === id);
  const feature = needs ?? entry?.needs;
  const off = needs ? !filter.features[needs] : entry ? hiddenReason(entry, filter) === "server" : false;
  if (!feature || !off) return children;
  const name = title ?? entry?.label ?? "This screen";
  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-surface-page">
      <ModuleHeader title={name} tone={tone} />
      <EmptyState drawing="box" title={`${name} is not set up on this server`} body={NEEDS_TEXT[feature]} />
    </SafeAreaView>
  );
}
