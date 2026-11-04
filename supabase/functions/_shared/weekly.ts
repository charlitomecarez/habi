// The weekly review in words. Shared by the app's Home card and the send-reminders emails,
// so both say the same thing from the same weekly_review_for() numbers. Plain TypeScript:
// no Deno or React Native APIs, so Metro and Deno both load it.

export type WeeklyReview = {
  week_start: string;
  week_end: string;
  spent: number;
  income: number;
  budgets: { category: string; available: number; spent: number }[];
  todos_done: number;
  todos_overdue: number;
  next_service: { item: string; status: string; km_remaining: number | null; days_remaining: number | null } | null;
  videos_due: { title: string; publish_on: string; stage: string }[];
  videos_published: number;
  habits: { name: string; done: number }[];
  gym_trained: number;
  gym_planned: number;
};

export type ReviewSection = { heading: string; lines: string[] };

const peso = (n: number) =>
  `${n < 0 ? "−" : ""}₱${Math.abs(n).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const day = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { timeZone: "UTC", weekday: "short", month: "short", day: "numeric" });

/** One section per module, in the order they show on the card and in the email. */
export function reviewSections(r: WeeklyReview): ReviewSection[] {
  const out: ReviewSection[] = [];

  const money = [`Spent ${peso(r.spent)} this week · income ${peso(r.income)}`];
  for (const b of r.budgets) {
    const left = b.available - b.spent;
    money.push(left < 0 ? `${b.category}: Over by ${peso(-left)} this month` : `${b.category}: ${peso(left)} left this month`);
  }
  out.push({ heading: "Money", lines: money });

  out.push({
    heading: "Todos",
    lines: [`${plural(r.todos_done, "todo")} done`, ...(r.todos_overdue ? [`${r.todos_overdue} Overdue`] : [])],
  });

  if (r.next_service) {
    const s = r.next_service;
    const when =
      s.status === "overdue"
        ? "Overdue"
        : s.km_remaining !== null
          ? `in ${s.km_remaining.toLocaleString("en-PH")} km`
          : s.days_remaining !== null
            ? `in ${plural(s.days_remaining, "day")}`
            : "Due soon";
    out.push({ heading: "Vehicle", lines: [`Next service: ${s.item}, ${when}`] });
  }

  if (r.videos_due.length || r.videos_published) {
    out.push({
      heading: "Videos",
      lines: [
        ...(r.videos_published ? [`${plural(r.videos_published, "video")} published`] : []),
        ...r.videos_due.slice(0, 5).map((v) => `${v.title}: publish ${day(v.publish_on)}${v.publish_on < r.week_start ? " (Late)" : ""}`),
      ],
    });
  }

  if (r.habits.length) {
    out.push({ heading: "Habits", lines: r.habits.map((h) => `${h.name}: done ${plural(h.done, "day")}`) });
  }

  if (r.gym_planned || r.gym_trained) {
    out.push({ heading: "Gym", lines: [`Trained ${r.gym_trained} of ${plural(r.gym_planned, "gym day")}`] });
  }
  return out;
}

/** Short lines for the Sunday digest section. */
export function reviewSummary(r: WeeklyReview): string[] {
  return [
    `Spent ${peso(r.spent)}`,
    `${plural(r.todos_done, "todo")} done`,
    ...(r.gym_planned ? [`Gym ${r.gym_trained} of ${r.gym_planned}`] : []),
    ...(r.videos_due.length ? [`${plural(r.videos_due.length, "video")} to publish`] : []),
  ];
}
