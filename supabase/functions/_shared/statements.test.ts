import { describe, expect, it } from "vitest";

import {
  addReferences,
  detectBank,
  parseStatement,
  toLines,
  totalsMatch,
  type Line,
  type Statement,
} from "./statements";

// Every row here is made up. Never paste a real statement into a fixture.
const lines = (...texts: string[]): Line[] => texts.map((text) => ({ text, items: [{ text, x: 0, y: 0 }] }));

const goTyme = () =>
  lines(
    "www.gotyme.com.ph",
    "Period: 01 Oct 2026 - 31 Oct 2026",
    "Opening balance PHP 1,000.00",
    "Closing balance PHP 1,400.00",
    "Total Credit PHP 900.00",
    "Total Debit PHP 500.00",
    "03 Oct 2026 Card payment at SAMPLE STORE, Card ending 0000 0.00 400.00 600.00",
    "05 Oct 2026 Transfer to GCash, Account No. 000 0.00 100.00 500.00",
    "10 Oct 2026 Sample salary 900.00 0.00 1,400.00",
  );

const gcash = () =>
  lines(
    "GCash Transaction History",
    "2026-10-01 to 2026-10-31",
    "STARTING BALANCE 500.00",
    "ENDING BALANCE 630.00",
    "Total Credit 300.00",
    "Total Debit 170.00",
    "2026-10-02 09:15 AM Received GCash from SAMPLE PERSON 1000000001 300.00 800.00",
    "2026-10-03 10:00 AM Buy Load 1000000002 100.00 700.00",
    "Payment to SAMPLE SHOP",
    "2026-10-04 11:00 AM 1000000003 50.00 650.00",
    "with account 0000",
    "2026-10-05 12:00 PM Transfer from 09170000001 to 09170000002 1000000004 20.00 630.00",
  );

/** MariBank tells outgoing from incoming by the x position of the amount. */
const OUT_X = 400;
const IN_X = 500;
const mariBank = () => {
  let y = 800;
  const row = (...cells: [string, number][]) => {
    y -= 20;
    return cells.map(([text, x]) => ({ text, x, y }));
  };
  return toLines([
    ...row(["MARIBANK ACCOUNT", 0]),
    ...row(["01 OCT 2026 to 31 OCT 2026", 0]),
    ...row(["SAVINGS 1,000.00 200.00 50.00 850.00", 0]),
    ...row(["TRANSACTION DETAILS", 0]),
    ...row(["DATE TRANSACTION", 0], ["OUTGOING (PHP)", OUT_X], ["INCOMING (PHP)", IN_X]),
    ...row(["SAMPLE SHOP", 60]),
    ...row(["05 OCT", 0], ["200.00", OUT_X]),
    ...row(["Card payment", 60]),
    ...row(["Interest earned", 60]),
    ...row(["OCT", 0], ["50.00", IN_X]),
    ...row(["Interest", 60]),
    ...row(["INTEREST & TAX DETAILS", 0]),
  ]);
};

const parsed = (input: Line[]): Statement => {
  const statement = parseStatement(input);
  if (!statement) throw new Error("Expected a statement.");
  return statement;
};

describe("toLines", () => {
  it("groups items by height, top to bottom and left to right", () => {
    const result = toLines([
      { text: "world", x: 50, y: 100 },
      { text: "bottom", x: 0, y: 50 },
      { text: "hello", x: 0, y: 101 },
      { text: "   ", x: 0, y: 200 },
    ]);
    expect(result.map((l) => l.text)).toEqual(["hello world", "bottom"]);
  });
});

describe("detectBank", () => {
  it("finds each bank from the text", () => {
    expect(detectBank("Sample GCash Transaction History")).toBe("gcash");
    expect(detectBank("MARIBANK ACCOUNT")).toBe("maribank");
    expect(detectBank("www.GoTyme.com.ph")).toBe("gotyme");
    expect(detectBank("Some other bank")).toBeNull();
  });
});

describe("parseStatement", () => {
  it("returns null for an unknown bank", () => {
    expect(parseStatement(lines("Some other bank"))).toBeNull();
  });

  it("throws when a known bank changes its layout", () => {
    expect(() => parseStatement(lines("www.gotyme.com.ph", "No period here"))).toThrow(/layout/);
  });

  it("reads a GoTyme statement", () => {
    const s = parsed(goTyme());
    expect(s).toMatchObject({ bank: "gotyme", from: "2026-10-01", to: "2026-10-31", opening: 1000, closing: 1400 });
    expect(s.rows[0]).toMatchObject({
      occurredOn: "2026-10-03",
      kind: "expense",
      amount: 400,
      name: "SAMPLE STORE",
      otherBank: null,
    });
    expect(s.rows[1]).toMatchObject({ kind: "expense", amount: 100, otherBank: "gcash" });
    expect(s.rows[2]).toMatchObject({ kind: "income", amount: 900, name: "Sample salary" });
    expect(totalsMatch(s)).toBe(true);
  });

  it("reads a GCash statement and takes the direction from the balance", () => {
    const s = parsed(gcash());
    expect(s.rows.map((r) => r.kind)).toEqual(["income", "expense", "expense", "expense"]);
    expect(s.rows.map((r) => r.name)).toEqual(["SAMPLE PERSON", "Buy load", "SAMPLE SHOP", "GCash transfer ••••0002"]);
    expect(s.rows[0].ref).toBe("1000000001");
    expect(totalsMatch(s)).toBe(true);
  });

  it("joins a GCash description that wraps around the date line", () => {
    expect(parsed(gcash()).rows[2].details).toBe("Payment to SAMPLE SHOP with account 0000");
  });

  it("reads a MariBank statement and takes the direction from the column", () => {
    const s = parsed(mariBank());
    expect(s).toMatchObject({ bank: "maribank", opening: 1000, debits: 200, credits: 50, closing: 850 });
    expect(s.rows[0]).toMatchObject({ occurredOn: "2026-10-05", kind: "expense", amount: 200, name: "SAMPLE SHOP" });
    expect(s.rows[0].details).toBe("SAMPLE SHOP Card payment");
    expect(totalsMatch(s)).toBe(true);
  });

  it("gives the MariBank interest row the last day of the period", () => {
    expect(parsed(mariBank()).rows[1]).toMatchObject({ occurredOn: "2026-10-31", kind: "income", amount: 50 });
  });
});

describe("totalsMatch", () => {
  it("fails when a row is missing", () => {
    const s = parsed(goTyme());
    expect(totalsMatch({ ...s, rows: s.rows.slice(1) })).toBe(false);
  });

  it("fails when the balances do not add up", () => {
    expect(totalsMatch({ ...parsed(goTyme()), closing: 1401 })).toBe(false);
  });

  it("compares in cents, so float sums do not fail", () => {
    const row = parsed(goTyme()).rows[0];
    const s: Statement = {
      ...parsed(goTyme()),
      opening: 1,
      closing: 0.7,
      credits: 0,
      debits: 0.3,
      rows: [
        { ...row, amount: 0.1 },
        { ...row, amount: 0.2 },
      ],
    };
    expect(totalsMatch(s)).toBe(true);
  });
});

describe("addReferences", () => {
  it("keeps a bank reference", async () => {
    const s = await addReferences(parsed(gcash()));
    expect(s.rows[0].ref).toBe("1000000001");
  });

  it("gives the same reference on a second import", async () => {
    const first = await addReferences(parsed(goTyme()));
    const second = await addReferences(parsed(goTyme()));
    expect(second.rows.map((r) => r.ref)).toEqual(first.rows.map((r) => r.ref));
  });

  it("gives two equal rows different references", async () => {
    const s = parsed(goTyme());
    const twice = await addReferences({ ...s, rows: [s.rows[0], s.rows[0]] });
    expect(twice.rows[0].ref).not.toBe(twice.rows[1].ref);
  });
});
