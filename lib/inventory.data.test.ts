import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  useAddLocation,
  useDeleteItem,
  useDeleteLocation,
  useItem,
  useItems,
  useLocations,
  useSaveItem,
  type InventoryItem,
} from "@/lib/inventory";
import { argsOf, resetSupabase, respond, targets } from "@/lib/test/fake-supabase";
import { queryClient, runMutation, runQuery } from "@/lib/test/fake-query";

vi.mock("@/lib/supabase", () => import("@/lib/test/fake-supabase"));
vi.mock("@tanstack/react-query", () => import("@/lib/test/fake-query"));
vi.mock("@/lib/photos", () => ({
  PHOTO_URLS_KEY: "photo-urls",
  uploadPhoto: vi.fn(async (bucket: string, name: string) => `${bucket}/${name}.webp`),
  removePhoto: vi.fn(async () => {}),
}));

const item: InventoryItem = {
  id: "i1",
  name: "Drill",
  category: "Tools",
  quantity: 1,
  notes: null,
  photo_path: "inventory/old.webp",
  location_id: null,
  updated_at: "2026-11-01T00:00:00Z",
  acquired_on: null,
  price: null,
  receipt_path: null,
  warranty_ends_on: null,
};

const input = {
  name: "Drill",
  locationId: "l1",
  quantity: 2,
  category: null,
  notes: null,
  acquiredOn: new Date(2026, 10, 1),
  price: 1500,
  warrantyEndsOn: null,
};

beforeEach(() => {
  resetSupabase();
  vi.clearAllMocks();
});

describe("inventory data", () => {
  it("reads locations with their paths", async () => {
    respond({
      data: [
        { id: "a", name: "Room", parent_id: null },
        { id: "b", name: "Shelf", parent_id: "a" },
      ],
    });
    const rows = (await runQuery(useLocations())) as { path: string }[];
    expect(targets()).toEqual(["inventory_locations"]);
    expect(rows.map((r) => r.path)).toEqual(["Room", "Room › Shelf"]);
  });

  it("reads items by name, and throws a read error", async () => {
    respond({ data: [item] });
    expect(await runQuery(useItems())).toEqual([item]);
    expect(argsOf("order")).toEqual([["name"]]);
    respond({ data: null, error: new Error("down") });
    await expect(runQuery(useItems())).rejects.toThrow("down");
  });

  it("finds one item in the list", () => {
    expect(useItem("i1").data).toBeUndefined();
  });

  it("inserts a new item with formatted dates", async () => {
    respond({ data: { id: "new" } });
    await runMutation(useSaveItem(), { input, photo: undefined });
    expect(argsOf("insert")[0][0]).toMatchObject({
      location_id: "l1",
      acquired_on: "2026-11-01",
      warranty_ends_on: null,
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledTimes(3);
  });

  it("updates an item and swaps its photo and receipt", async () => {
    const photo = { uri: "file://p.jpg", width: 10, height: 10 };
    await runMutation(useSaveItem(), { item, input, photo, receipt: photo });
    expect(argsOf("update").map((a) => Object.keys(a[0] as object))).toEqual([
      ["name", "location_id", "quantity", "category", "notes", "acquired_on", "price", "warranty_ends_on"],
      ["receipt_path"],
      ["photo_path"],
    ]);
  });

  it("removes the new photo when its save fails", async () => {
    const photos = await import("@/lib/photos");
    respond({}, { error: new Error("rls") });
    const photo = { uri: "file://p.jpg", width: 10, height: 10 };
    await expect(runMutation(useSaveItem(), { item, input, photo })).rejects.toThrow("rls");
    expect(photos.removePhoto).toHaveBeenCalledWith("inventory/i1.webp");
  });

  it("removes the new receipt when its save fails", async () => {
    const photos = await import("@/lib/photos");
    respond({}, { error: new Error("rls") });
    const photo = { uri: "file://p.jpg", width: 10, height: 10 };
    await expect(runMutation(useSaveItem(), { item, input, photo: undefined, receipt: photo })).rejects.toThrow("rls");
    expect(photos.removePhoto).toHaveBeenCalledWith("receipts/item-i1.webp");
  });

  it("deletes an item and its files", async () => {
    const photos = await import("@/lib/photos");
    await runMutation(useDeleteItem(), item);
    expect(argsOf("eq")).toEqual([["id", "i1"]]);
    expect(photos.removePhoto).toHaveBeenCalledWith("inventory/old.webp");
  });

  it("adds and deletes a location", async () => {
    respond({ data: { id: "l9" } });
    expect(await runMutation(useAddLocation(), { name: "Box", parentId: null })).toBe("l9");
    await runMutation(useDeleteLocation(), "l9");
    expect(targets()).toEqual(["inventory_locations", "inventory_locations"]);
    respond({ error: new Error("x") });
    await expect(runMutation(useDeleteLocation(), "l9")).rejects.toThrow("x");
  });
});
