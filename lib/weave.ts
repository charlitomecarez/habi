export type Strand = "good" | "watch" | "over" | "empty";

export type WeaveRow = {
  label: string;
  /** Seven strands, Monday first. */
  days: readonly Strand[];
};

const count = (days: readonly Strand[], state: Strand) => days.filter((d) => d === state).length;

/** One line for TalkBack, such as "Money: 5 good days, 1 over". A strand never speaks by colour. */
export function weaveSummary(row: WeaveRow): string {
  const good = count(row.days, "good");
  const watch = count(row.days, "watch");
  const over = count(row.days, "over");
  const parts = [
    good ? `${good} good ${good === 1 ? "day" : "days"}` : null,
    watch ? `${watch} to watch` : null,
    over ? `${over} over` : null,
  ].filter(Boolean);
  return `${row.label}: ${parts.length > 0 ? parts.join(", ") : "no data"}`;
}

export const STRAND_WORD: Record<Strand, string> = {
  good: "Good",
  watch: "Watch",
  over: "Over",
  empty: "No data",
};
