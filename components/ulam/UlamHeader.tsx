import type { ReactNode } from "react";
import type { SharedValue } from "react-native-reanimated";

import { ModuleHeader } from "@/components/ui/ModuleHeader";

/** The back button, the title and an optional action. */
export function UlamHeader({
  title,
  subtitle,
  action,
  scrollY,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  scrollY?: SharedValue<number>;
}) {
  return <ModuleHeader title={title} subtitle={subtitle} tone="daily" action={action} scrollY={scrollY} />;
}
