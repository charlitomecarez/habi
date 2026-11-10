import { describe, expect, it, vi } from "vitest";

import { imageMime, listPath } from "@/lib/photos";

vi.mock("@/lib/supabase", () => ({ supabase: {} }));
vi.mock("expo-image-manipulator", () => ({ ImageManipulator: {}, SaveFormat: { WEBP: "webp" } }));

describe("listPath", () => {
  it("gives a WebP photo its list copy beside it", () => {
    expect(listPath("u1/inventory/item-1700000000000.webp")).toBe("u1/inventory/item-1700000000000.320.webp");
  });

  it("keeps an old JPEG, which has no list copy", () => {
    expect(listPath("u1/inventory/item-1700000000000.jpg")).toBe("u1/inventory/item-1700000000000.jpg");
  });

  it("keeps a list copy and an empty path as they are", () => {
    expect(listPath("u1/inventory/a.320.webp")).toBe("u1/inventory/a.320.webp");
    expect(listPath(null)).toBeNull();
  });
});

describe("imageMime", () => {
  it("names WebP from its first bytes, and JPEG otherwise", () => {
    expect(imageMime("UklGRiQAAABXRUJQ")).toBe("image/webp");
    expect(imageMime("/9j/4AAQSkZJRg")).toBe("image/jpeg");
  });
});
