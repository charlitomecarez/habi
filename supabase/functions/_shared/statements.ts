// Reads GoTyme, GCash and MariBank statements from positioned PDF text.
// Pure functions: they know nothing about pdf.js, keys or the database.

export type TextItem = { text: string; x: number; y: number };
export type Line = { text: string; items: TextItem[] };
export type Bank = "gotyme" | "gcash" | "maribank";

export type StatementRow = {
  occurredOn: string;
  kind: "expense" | "income";
  amount: number;
  /** The cleaned name for Money. */
  name: string;
  /** The full text from the statement, used for the reference hash. */
  details: string;
  /** The bank reference, when the statement has one. */
  ref: string | null;
  /** The other bank, when the row moves money between the three banks. */
  otherBank: Bank | null;
};

export type Statement = {
  bank: Bank;
  from: string;
  to: string;
  opening: number;
  closing: number;
  credits: number;
  debits: number;
  rows: StatementRow[];
};

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const MONEY = String.raw`[\d,]+\.\d{2}`;

const toNumber = (text: string) => Number(text.replace(/,/g, ""));
const toCents = (value: number) => Math.round(value * 100);

function isoDate(day: string | number, month: string, year: string | number): string {
  const m = MONTHS.indexOf(month.toUpperCase()) + 1;
  return `${year}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function must(text: string, pattern: RegExp): RegExpMatchArray {
  const match = text.match(pattern);
  if (!match) throw new Error("The statement layout is not the expected one.");
  return match;
}

/** Groups text items from one page into lines, top to bottom and left to right. */
export function toLines(items: TextItem[]): Line[] {
  const sorted = items.filter((i) => i.text.trim()).sort((a, b) => b.y - a.y || a.x - b.x);
  const rows: { y: number; items: TextItem[] }[] = [];
  for (const item of sorted) {
    const row = rows.find((r) => Math.abs(r.y - item.y) < 2.5);
    if (row) row.items.push(item);
    else rows.push({ y: item.y, items: [item] });
  }
  return rows.map((row) => {
    const ordered = row.items.sort((a, b) => a.x - b.x);
    return { items: ordered, text: ordered.map((i) => i.text.trim()).join(" ") };
  });
}

/** Finds the bank from the PDF text. The file name is never used. */
export function detectBank(text: string): Bank | null {
  if (/GCash Transaction History/.test(text)) return "gcash";
  if (/MARIBANK ACCOUNT/.test(text)) return "maribank";
  if (/gotyme\.com\.ph/i.test(text)) return "gotyme";
  return null;
}

function otherBankIn(text: string, own: Bank): Bank | null {
  if (own !== "gcash" && /GCash/i.test(text)) return "gcash";
  if (own !== "gotyme" && /GoTyme/i.test(text)) return "gotyme";
  if (own !== "maribank" && /MariBank/i.test(text)) return "maribank";
  return null;
}

function parseGoTyme(lines: Line[], text: string): Statement {
  const period = must(text, /Period:\s*(\d{2}) (\w{3}) (\d{4}) - (\d{2}) (\w{3}) (\d{4})/);
  const row = new RegExp(`^(\\d{2}) (\\w{3}) (\\d{4}) (.*?) (${MONEY}) (${MONEY}) (${MONEY})$`);
  const rows: StatementRow[] = [];

  for (const line of lines) {
    const m = line.text.match(row);
    if (!m) continue;
    const credit = toNumber(m[5]);
    const details = m[4];
    rows.push({
      occurredOn: isoDate(m[1], m[2], m[3]),
      kind: credit > 0 ? "income" : "expense",
      amount: credit > 0 ? credit : toNumber(m[6]),
      name: details.replace(/^Card payment at /, "").replace(/, (Card|Account No\.).*$/, ""),
      details,
      ref: null,
      otherBank: otherBankIn(details, "gotyme"),
    });
  }

  return {
    bank: "gotyme",
    from: isoDate(period[1], period[2], period[3]),
    to: isoDate(period[4], period[5], period[6]),
    opening: toNumber(must(text, new RegExp(`Opening balance\\s*PHP\\s*(${MONEY})`))[1]),
    closing: toNumber(must(text, new RegExp(`Closing balance\\s*PHP\\s*(${MONEY})`))[1]),
    credits: toNumber(must(text, new RegExp(`Total Credit\\s*PHP\\s*(${MONEY})`))[1]),
    debits: toNumber(must(text, new RegExp(`Total Debit\\s*PHP\\s*(${MONEY})`))[1]),
    rows,
  };
}

function gcashName(details: string, kind: StatementRow["kind"]): string {
  const transfer = details.match(/^Transfer from (\d+) to (\d+)/);
  if (transfer) {
    const other = kind === "income" ? transfer[1] : transfer[2];
    return `GCash transfer ••••${other.slice(-4)}`;
  }
  if (/^Buy Load/.test(details)) return "Buy load";
  const party = details.match(/^(?:Received GCash from|Sent GCash to|Bills Payment to|Payment to) (.+?)(?:,| with account| and invno|$)/);
  return party ? party[1].trim() : details;
}

function parseGcash(lines: Line[], text: string): Statement {
  const period = must(text, /(\d{4}-\d{2}-\d{2}) to (\d{4}-\d{2}-\d{2})/);
  const opening = toNumber(must(text, new RegExp(`STARTING BALANCE\\s*(${MONEY})`))[1]);
  const row = new RegExp(`^(\\d{4}-\\d{2}-\\d{2}) \\d{2}:\\d{2} [AP]M\\s*(.*?)\\s*(\\d{10,})\\s+(${MONEY})\\s+(${MONEY})$`);
  const rows: StatementRow[] = [];
  let balance = opening;

  lines.forEach((line, index) => {
    const m = line.text.match(row);
    if (!m) return;
    const amount = toNumber(m[4]);
    const next = toNumber(m[5]);
    // The statement prints one amount column, so the balance gives the direction.
    const kind = toCents(next) > toCents(balance) ? "income" : "expense";
    balance = next;
    // A long description wraps onto the lines above and below the date.
    const details = m[2] || `${lines[index - 1]?.text ?? ""} ${lines[index + 1]?.text ?? ""}`.trim();
    rows.push({
      occurredOn: m[1],
      kind,
      amount,
      name: gcashName(details, kind),
      details,
      ref: m[3],
      otherBank: otherBankIn(details, "gcash"),
    });
  });

  return {
    bank: "gcash",
    from: period[1],
    to: period[2],
    opening,
    closing: toNumber(must(text, new RegExp(`ENDING BALANCE\\s*(${MONEY})`))[1]),
    credits: toNumber(must(text, new RegExp(`Total Credit\\s*(${MONEY})`))[1]),
    debits: toNumber(must(text, new RegExp(`Total Debit\\s*(${MONEY})`))[1]),
    rows,
  };
}

const MARIBANK_HEADERS = /^(BANK STATEMENT|S\/N |\d{2} [A-Z]{3} \d{4}$|DATE TRANSACTION|page \d+ of \d+|SAVINGS - TRANSACTION)/;

function parseMaribank(lines: Line[], text: string): Statement {
  const period = must(text, /(\d{2}) ([A-Z]{3}) (\d{4}) to (\d{2}) ([A-Z]{3}) (\d{4})/);
  const summary = must(text, new RegExp(`SAVINGS\\s+(${MONEY})\\s+(${MONEY})\\s+(${MONEY})\\s+(${MONEY})`));
  const header = lines.find((l) => /OUTGOING \(PHP\)/.test(l.text));
  const outgoingX = header?.items.find((i) => /OUTGOING/.test(i.text))?.x;
  const incomingX = header?.items.find((i) => /INCOMING/.test(i.text))?.x;
  if (outgoingX === undefined || incomingX === undefined) throw new Error("The statement layout is not the expected one.");

  const start = lines.findIndex((l) => /TRANSACTION DETAILS/.test(l.text));
  const end = lines.findIndex((l) => /INTEREST & TAX DETAILS/.test(l.text));
  const body = lines.slice(start, end === -1 ? undefined : end).filter((l) => !MARIBANK_HEADERS.test(l.text));

  const row = new RegExp(`^(?:(\\d{2}) )?(${MONTHS.join("|")})\\b\\s*(.*?)\\s*(${MONEY})$`);
  const rows: StatementRow[] = [];

  body.forEach((line, index) => {
    const m = line.text.match(row);
    if (!m) return;
    const amountItem = line.items[line.items.length - 1];
    const incoming = Math.abs(amountItem.x - incomingX) < Math.abs(amountItem.x - outgoingX);
    // The name sits on the line above the date, and the type on the line below.
    const name = `${body[index - 1]?.text ?? ""} ${m[3]}`.trim();
    const type = body[index + 1]?.text ?? "";
    const year = m[2] === period[5] ? period[6] : period[3];
    rows.push({
      // The monthly interest row has no day, so it takes the last day of the period.
      occurredOn: isoDate(m[1] ?? period[4], m[2], year),
      kind: incoming ? "income" : "expense",
      amount: toNumber(m[4]),
      name,
      details: `${name} ${type}`.trim(),
      ref: null,
      otherBank: otherBankIn(name, "maribank"),
    });
  });

  return {
    bank: "maribank",
    from: isoDate(period[1], period[2], period[3]),
    to: isoDate(period[4], period[5], period[6]),
    opening: toNumber(summary[1]),
    debits: toNumber(summary[2]),
    credits: toNumber(summary[3]),
    closing: toNumber(summary[4]),
    rows,
  };
}

/** True when the rows add up to the totals that the statement prints. */
export function totalsMatch(s: Statement): boolean {
  const sum = (kind: StatementRow["kind"]) =>
    s.rows.filter((r) => r.kind === kind).reduce((total, r) => total + toCents(r.amount), 0);
  const credits = sum("income");
  const debits = sum("expense");
  return (
    credits === toCents(s.credits) &&
    debits === toCents(s.debits) &&
    toCents(s.opening) + credits - debits === toCents(s.closing)
  );
}

/** Parses the lines of a statement. Returns null when the bank is not known. */
export function parseStatement(lines: Line[]): Statement | null {
  const text = lines.map((l) => l.text).join("\n");
  const bank = detectBank(text);
  if (bank === "gotyme") return parseGoTyme(lines, text);
  if (bank === "gcash") return parseGcash(lines, text);
  if (bank === "maribank") return parseMaribank(lines, text);
  return null;
}

/** Gives rows with no bank reference a stable one, so a second import adds nothing. */
export async function addReferences(s: Statement): Promise<Statement> {
  const seen = new Map<string, number>();
  const rows: StatementRow[] = [];
  for (const row of s.rows) {
    if (row.ref) {
      rows.push(row);
      continue;
    }
    const base = `${s.bank}|${row.occurredOn}|${row.amount}|${row.details}`;
    const position = seen.get(base) ?? 0;
    seen.set(base, position + 1);
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${base}|${position}`));
    const ref = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
    rows.push({ ...row, ref });
  }
  return { ...s, rows };
}
