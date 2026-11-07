import type { ReactNode } from "react";

import { ModuleHeader } from "@/components/ui/ModuleHeader";

/** The back button, the title and an optional action. */
export function UlamHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return <ModuleHeader title={title} subtitle={subtitle} tone="daily" action={action} />;
}
