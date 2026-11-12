import { create } from "zustand";

export type SnackbarMessage = {
  text: string;
  /** One action, such as "Undo" or "Try again". */
  actionLabel?: string;
  onAction?: () => void;
  /** An error stays until you act or close it, and TalkBack reads it at once. */
  tone?: "info" | "error";
};

type SnackbarState = {
  message: (SnackbarMessage & { id: number }) | null;
  show: (message: SnackbarMessage) => void;
  hide: () => void;
};

let next = 0;

export const useSnackbarStore = create<SnackbarState>((set) => ({
  message: null,
  show: (message) => set({ message: { ...message, id: ++next } }),
  hide: () => set({ message: null }),
}));

/** One line at the bottom with one action. A new message replaces the one on screen. */
export function showSnackbar(message: SnackbarMessage): void {
  useSnackbarStore.getState().show(message);
}

export function hideSnackbar(): void {
  useSnackbarStore.getState().hide();
}
