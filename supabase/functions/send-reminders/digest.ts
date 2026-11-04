export type DigestInput = {
  /** YYYY-MM-DD in the user's time zone. */
  today: string;
  todos: { title: string; overdue: boolean }[];
  services: { item: string; vehicle: string }[];
  renewals: { name: string; amount: string; on: string }[];
  /** Today's medicine doses, in time order, e.g. "8:00 AM". */
  medicines: { name: string; dose: string; time: string; status: "pending" | "taken" | "skipped" }[];
  /** Today's tip from daily_tips. Added only to a digest that already has something in it. */
  tip: string | null;
};

type Section = { heading: string; lines: string[] };

function escapeHtml(text: string): string {
  return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function formatDay(day: string): string {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString("en-US", {
    timeZone: "UTC",
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/** Subject, HTML and text for one digest email, or null when there is nothing to report. */
export function buildDigest(input: DigestInput) {
  const sections: Section[] = [];
  if (input.todos.length > 0) {
    sections.push({
      heading: "Todos for today",
      lines: input.todos.map((t) => (t.overdue ? `${t.title} (Overdue)` : t.title)),
    });
  }
  if (input.services.length > 0) {
    sections.push({
      heading: "Overdue services",
      lines: input.services.map((s) => `${s.vehicle}: ${s.item}`),
    });
  }
  if (input.renewals.length > 0) {
    sections.push({
      heading: "Renewing in the next 7 days",
      lines: input.renewals.map((r) => `${r.name}, ${r.amount}, ${formatDay(r.on)}`),
    });
  }
  if (input.medicines.length > 0) {
    sections.push({
      heading: "Medicines today",
      lines: input.medicines.map(
        (m) =>
          `${m.time}: ${m.name}${m.dose ? `, ${m.dose}` : ""}${m.status === "taken" ? " (Taken)" : m.status === "skipped" ? " (Skipped)" : ""}`,
      ),
    });
  }
  if (sections.length === 0) return null;
  if (input.tip) sections.push({ heading: "Tip for today", lines: [input.tip] });

  const subject = `Your day: ${formatDay(input.today)}`;
  const text = sections.map((s) => [s.heading, ...s.lines.map((l) => `- ${l}`)].join("\n")).join("\n\n");
  const html = [
    `<div style="font-family:system-ui,sans-serif;color:#1A1C1E;max-width:560px">`,
    `<h1 style="font-size:20px">${escapeHtml(subject)}</h1>`,
    ...sections.map(
      (s) =>
        `<h2 style="font-size:16px;margin:24px 0 8px">${escapeHtml(s.heading)}</h2>` +
        `<ul style="margin:0;padding-left:20px">${s.lines.map((l) => `<li>${escapeHtml(l)}</li>`).join("")}</ul>`,
    ),
    `<p style="color:#5B6168;font-size:13px;margin-top:32px">Sent by my-app. Turn off the digest in More › Settings.</p>`,
    `</div>`,
  ].join("");

  return { subject, html, text };
}
