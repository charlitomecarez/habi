import { describe, expect, it } from "vitest";

import { locationLink, parseLocationLink, qrMatrix } from "@/lib/qr";

const ID = "3f2b8c1e-7a4d-4e2f-9b6a-1c0d5e8f7a90";

describe("location labels", () => {
  it("reads back the id it encodes", () => {
    expect(parseLocationLink(locationLink(ID))).toBe(ID);
  });

  it("ignores case and surrounding spaces", () => {
    expect(parseLocationLink(`  ${locationLink(ID.toUpperCase())}\n`)).toBe(ID);
  });

  it("rejects codes that are not my-app labels", () => {
    expect(parseLocationLink("https://example.com")).toBeNull();
    expect(parseLocationLink("myapp://inventory?location=not-an-id")).toBeNull();
  });

  it("builds a square module matrix", () => {
    const matrix = qrMatrix(locationLink(ID));
    expect(matrix.length).toBeGreaterThan(20);
    expect(matrix.every((row) => row.length === matrix.length)).toBe(true);
  });
});
