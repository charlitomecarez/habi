import type { Href } from "expo-router";

/** Where a tap on a reminder goes. An ID that belongs to a child row opens the list, as the design says. */
export function reminderRoute(source: unknown, id: unknown): Href {
  const item = typeof id === "string" && id ? id : null;
  const open = (pathname: string, list: string): Href => (item ? { pathname, params: { id: item } } : list) as Href;
  switch (source) {
    case "todo":
      return open("/todo/[id]", "/todos");
    case "habit":
      return open("/habits/[id]", "/habits");
    case "debt":
      return open("/debts/[id]", "/debts");
    case "document":
      return open("/documents/[id]", "/documents");
    case "subscription":
      return open("/money/subscription/[id]", "/money/subscriptions");
    case "content":
      return open("/content/video/[id]", "/content");
    case "inventory":
      return open("/inventory/item/[id]", "/inventory");
    case "trip_item":
      return open("/travel/item/[id]", "/travel");
    case "inbox":
      return "/inbox";
    case "feedback":
      return "/reports";
    case "vehicle_service":
      return "/vehicle";
    case "budget":
      return "/money/budgets";
    case "person_date":
      return "/people";
    case "medicine":
      return "/health";
    case "workout":
      return "/gym";
    default:
      return "/";
  }
}
