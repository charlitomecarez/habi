import type { Href } from "expo-router";

import type { TileIcon, TileTone } from "@/components/ui/ModuleTile";

export type ModuleEntry = {
  id: string;
  label: string;
  href: Href;
  icon: TileIcon;
  tone: TileTone;
  /** Extra words for the search on More. */
  keywords: string;
  /** Only the admin sees this tile. The server checks too. */
  adminOnly?: boolean;
};

export type ModuleSection = { title: string; modules: readonly ModuleEntry[] };

/** The modules on More, in sections. The tabs are not here, because the tab bar already shows them. */
export const MODULE_SECTIONS: readonly ModuleSection[] = [
  {
    title: "Daily life",
    modules: [
      {
        id: "habits",
        label: "Habits",
        href: "/habits",
        icon: { name: "repeat-outline" },
        tone: "daily",
        keywords: "streak",
      },
      {
        id: "gym",
        label: "Gym",
        href: "/gym",
        icon: { name: "barbell-outline" },
        tone: "daily",
        keywords: "workout exercise",
      },
      {
        id: "journal",
        label: "Journal",
        href: "/journal",
        icon: { name: "book-outline" },
        tone: "daily",
        keywords: "diary mood",
      },
      {
        id: "health",
        label: "Health",
        href: "/health",
        icon: { name: "medkit-outline" },
        tone: "daily",
        keywords: "medicine doctor weight",
      },
      {
        id: "alarms",
        label: "Alarms",
        href: "/alarms",
        icon: { name: "alarm-outline" },
        tone: "daily",
        keywords: "wake clock gising",
      },
      {
        id: "ulam",
        label: "Ulam",
        href: "/ulam",
        icon: { name: "restaurant-outline" },
        tone: "daily",
        keywords: "food meal cook recipe calories",
      },
      {
        id: "sports",
        label: "Sports",
        href: "/sports",
        icon: { name: "football-outline" },
        tone: "daily",
        keywords: "football nba basketball standings",
      },
      {
        id: "weather",
        label: "Weather",
        href: "/weather",
        icon: { name: "partly-sunny-outline" },
        tone: "daily",
        keywords: "rain forecast temperature ulan panahon",
      },
      {
        id: "news",
        label: "News",
        href: "/news",
        icon: { name: "newspaper-outline" },
        tone: "daily",
        keywords: "headlines balita philippines world",
      },
    ],
  },
  {
    title: "People",
    modules: [
      {
        id: "people",
        label: "People",
        href: "/people",
        icon: { name: "people-outline" },
        tone: "people",
        keywords: "birthday anniversary gift dates",
      },
      {
        id: "debts",
        label: "Debts",
        href: "/debts",
        icon: { name: "swap-horizontal-outline" },
        tone: "people",
        keywords: "utang owe",
      },
      {
        id: "inbox",
        label: "Inbox",
        href: "/inbox",
        icon: { name: "mic-outline" },
        tone: "people",
        keywords: "voice message record taglish",
      },
    ],
  },
  {
    title: "Home and plans",
    modules: [
      {
        id: "inventory",
        label: "Inventory",
        href: "/inventory",
        icon: { name: "cube-outline" },
        tone: "home",
        keywords: "items box room",
      },
      {
        id: "shopping",
        label: "Shopping",
        href: "/shopping",
        icon: { name: "cart-outline" },
        tone: "home",
        keywords: "grocery list",
      },
      {
        id: "travel",
        label: "Travel",
        href: "/travel",
        icon: { name: "airplane-outline" },
        tone: "home",
        keywords: "trip plan itinerary",
      },
    ],
  },
  {
    title: "Records and work",
    modules: [
      {
        id: "work",
        label: "Find a work",
        href: "/work",
        icon: { name: "briefcase-outline" },
        tone: "records",
        keywords: "job career resume cover letter apply",
        adminOnly: true,
      },
      {
        id: "documents",
        label: "Documents",
        href: "/documents",
        icon: { name: "document-text-outline" },
        tone: "records",
        keywords: "renewal expiry licence passport",
      },
      {
        id: "vault",
        label: "Vault",
        href: "/vault",
        icon: { name: "lock-closed-outline" },
        tone: "records",
        keywords: "password",
      },
      {
        id: "content",
        label: "Content",
        href: "/content",
        icon: { name: "videocam-outline" },
        tone: "records",
        keywords: "video planner",
      },
    ],
  },
];

export const ALL_MODULES: readonly ModuleEntry[] = MODULE_SECTIONS.flatMap((s) => s.modules);

export const MAX_SHORTCUTS = 8;

/** The saved shortcuts in order. Names the app does not know are skipped. */
export function shortcutModules(ids: readonly string[]): ModuleEntry[] {
  return ids
    .map((id) => ALL_MODULES.find((m) => m.id === id))
    .filter((m): m is ModuleEntry => m !== undefined)
    .slice(0, MAX_SHORTCUTS);
}

/** Adds or removes a shortcut. Adding past the limit changes nothing. */
export function toggleShortcut(ids: readonly string[], id: string): string[] {
  if (ids.includes(id)) return ids.filter((x) => x !== id);
  return ids.length >= MAX_SHORTCUTS ? [...ids] : [...ids, id];
}

/** Sections with only the modules that match the search. Empty sections go. */
export function searchModules(query: string): ModuleSection[] {
  const typed = query.trim().toLowerCase();
  if (!typed) return [...MODULE_SECTIONS];
  return MODULE_SECTIONS.map((section) => ({
    ...section,
    modules: section.modules.filter((m) => `${m.label} ${m.keywords}`.toLowerCase().includes(typed)),
  })).filter((section) => section.modules.length > 0);
}
