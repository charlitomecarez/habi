import { Text } from "react-native";

import { ModuleBar } from "@/components/ui/ModuleHeader";
import type { ReactNode } from "react";

/** The back button, the title and an optional action. */
export function UlamHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <ModuleBar tone="daily">
      <Text accessibilityRole="header" numberOfLines={1} className="flex-1 font-bold text-title text-on-shell">
        {title}
      </Text>
      {action}
    </ModuleBar>
  );
}
