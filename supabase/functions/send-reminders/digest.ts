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
  /** On Sunday, the weekly review in short (the same numbers as the Home card). */
  week: string[] | null;
};

export type Section = { heading: string; lines: string[] };

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

/**
 * Subject, HTML and text for one digest email, or null when there is nothing to report.
 * `appUrl` (the APP_URL secret) adds an Open Habi button; without it there is no button.
 */
export function buildDigest(input: DigestInput, appUrl: string | null = null) {
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

  if (input.week) sections.push({ heading: "Your week", lines: input.week });
  return renderEmail(`Your day: ${formatDay(input.today)}`, sections, appUrl);
}

/** The weekly review email, sent on Sunday: the same lines as the Home card. */
export function buildWeeklyReview(today: string, sections: Section[], appUrl: string | null = null) {
  return renderEmail(`Your week to ${formatDay(today)}`, sections, appUrl);
}

/** Subject, HTML and plain text in the Habi email look. */
export function renderEmail(subject: string, sections: Section[], appUrl: string | null) {
  const text = [
    ...sections.map((s) => [s.heading, ...s.lines.map((l) => `- ${l}`)].join("\n")),
    "Sent by Habi. Turn off the digest in More > Settings.",
  ].join("\n\n");

  // Tables and inline styles only: Gmail removes <style> blocks and web fonts. The Banig look:
  // a cream ground, the indigo shell band, the woven strip, then one cream card.
  const C = {
    page: "#F4ECD6",
    card: "#FFFBF0",
    border: "#D8CBA6",
    divider: "#E4D8B8",
    ink: "#1E1B3A",
    muted: "#5A5578",
    shell: "#23205C",
    onShell: "#F7EFD9",
    good: "#0B7A55",
    watch: "#8A5A00",
    over: "#B4105A",
    goodFill: "#12A071",
    watchFill: "#F5B301",
    overFill: "#D6176E",
  };
  const font = "font-family:'Schibsted Grotesk',Roboto,'Helvetica Neue',Arial,sans-serif;";
  // A status word at the end of a line, such as "(Overdue)", keeps its word and gets its colour.
  const STATUS: Record<string, string> = { Overdue: C.over, Taken: C.good, Skipped: C.watch };
  const line = (l: string) => {
    const m = l.match(/^(.*) \((Overdue|Taken|Skipped)\)$/);
    const body = escapeHtml(m ? m[1] : l);
    const word = m
      ? `<td align="right" style="${font}font-size:13px;line-height:24px;font-weight:bold;color:${STATUS[m[2]]};white-space:nowrap;padding-left:12px;">${m[2]}</td>`
      : "";
    return (
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>` +
      `<td style="${font}font-size:16px;line-height:24px;color:${C.ink};padding:0 0 8px;">${body}</td>${word}</tr></table>`
    );
  };
  const section = (s: Section, index: number) =>
    `<tr><td style="padding:${index === 0 ? "0" : "12px"} 0 4px;${index === 0 ? "" : `border-top:2px solid ${C.divider};`}${font}">` +
    `<p style="margin:0 0 8px;font-size:16px;line-height:22px;font-weight:bold;color:${C.ink};">${escapeHtml(s.heading)}</p>` +
    s.lines.map(line).join("") +
    `</td></tr>`;
  const strands: [string, number][] = [
    [C.goodFill, 18],
    [C.onShell, 6],
    [C.watchFill, 18],
    [C.onShell, 6],
    [C.overFill, 18],
    [C.onShell, 6],
  ];
  const weave =
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="table-layout:fixed;"><tr>` +
    Array.from({ length: 7 }, () =>
      strands
        .map(
          ([color, w]) =>
            `<td width="${((w * 100) / 504).toFixed(2)}%" style="background:${color};height:8px;line-height:8px;font-size:0;">&nbsp;</td>`,
        )
        .join(""),
    ).join("") +
    `</tr></table>`;
  const button = appUrl
    ? `<tr><td style="padding:16px 0 0;"><table role="presentation" cellpadding="0" cellspacing="0"><tr>` +
      `<td style="background:${C.shell};border-radius:12px;"><a href="${escapeHtml(appUrl)}" ` +
      `style="display:inline-block;padding:14px 22px;${font}font-size:16px;font-weight:bold;color:#FFFFFF;text-decoration:none;">Open Habi</a>` +
      `</td></tr></table></td></tr>`
    : "";
  const html = [
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">`,
    `<meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light only"><title>${escapeHtml(subject)}</title></head>`,
    `<body style="margin:0;padding:0;background:${C.page};">`,
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.page};"><tr><td align="center" style="padding:32px 16px;">`,
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">`,
    `<tr><td style="background:${C.shell};border-radius:16px 16px 0 0;padding:16px 20px;${font}font-size:20px;font-weight:900;color:${C.onShell};">Habi</td></tr>`,
    `<tr><td style="padding:0;">${weave}</td></tr>`,
    `<tr><td style="background:${C.card};border:2px solid ${C.border};border-top:0;border-radius:0 0 16px 16px;padding:24px 20px;">`,
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">`,
    `<tr><td style="padding:0 0 16px;${font}font-size:22px;line-height:28px;font-weight:900;color:${C.ink};">${escapeHtml(subject)}</td></tr>`,
    ...sections.map(section),
    button,
    `</table></td></tr>`,
    `<tr><td style="padding:16px 4px 0;${font}font-size:12px;line-height:18px;color:${C.muted};">Sent by Habi. Turn off the digest in More &gt; Settings.</td></tr>`,
    `</table></td></tr></table></body></html>`,
  ].join("");

  return { subject, html, text };
}
