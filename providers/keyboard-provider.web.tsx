import type { ReactNode } from "react";

/** Nothing to track on the web. */
export function KeyboardProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
