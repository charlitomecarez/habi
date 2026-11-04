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

/**
 * Subject, HTML and text for one digest email, or null when there is nothing to report.
 * `appUrl` (the APP_URL secret) adds an Open my-app button; without it there is no button.
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

  const subject = `Your day: ${formatDay(input.today)}`;
  const text = [
    ...sections.map((s) => [s.heading, ...s.lines.map((l) => `- ${l}`)].join("\n")),
    "Sent by my-app. Turn off the digest in More > Settings.",
  ].join("\n\n");

  // Tables and inline styles only: Gmail removes <style> blocks and web fonts.
  const C = { accent: "#0F766E", ink: "#1A1C1E", muted: "#5B6168", page: "#F6F6F3", card: "#FFFFFF", border: "#E3E5E0" };
  const font = "font-family:Arial,Helvetica,sans-serif;";
  const card = (s: Section) =>
    `<tr><td style="padding:0 0 12px;">` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.card};border:1px solid ${C.border};border-radius:16px;">` +
    `<tr><td style="padding:18px 20px;${font}">` +
    `<p style="margin:0 0 10px;font-size:13px;line-height:19px;font-weight:bold;letter-spacing:0.5px;text-transform:uppercase;color:${C.muted};">${escapeHtml(s.heading)}</p>` +
    s.lines
      .map((l) => `<p style="margin:0 0 8px;font-size:16px;line-height:24px;color:${C.ink};">${escapeHtml(l)}</p>`)
      .join("") +
    `</td></tr></table></td></tr>`;
  const button = appUrl
    ? `<tr><td style="padding:8px 0 4px;"><table role="presentation" cellpadding="0" cellspacing="0"><tr>` +
      `<td style="background:${C.accent};border-radius:12px;"><a href="${escapeHtml(appUrl)}" ` +
      `style="display:inline-block;padding:14px 22px;${font}font-size:16px;font-weight:bold;color:#FFFFFF;text-decoration:none;">Open my-app</a>` +
      `</td></tr></table></td></tr>`
    : "";
  const html = [
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">`,
    `<meta name="color-scheme" content="light only"><title>${escapeHtml(subject)}</title></head>`,
    `<body style="margin:0;padding:0;background:${C.page};">`,
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.page};"><tr><td align="center" style="padding:32px 16px;">`,
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">`,
    `<tr><td style="padding:0 4px 4px;${font}font-size:18px;font-weight:bold;color:${C.accent};">my-app</td></tr>`,
    `<tr><td style="padding:0 4px 16px;${font}font-size:22px;line-height:28px;font-weight:bold;color:${C.ink};">${escapeHtml(subject)}</td></tr>`,
    ...sections.map(card),
    button,
    `<tr><td style="padding:16px 4px 0;${font}font-size:12px;line-height:18px;color:${C.muted};">Sent by my-app. Turn off the digest in More &gt; Settings.</td></tr>`,
    `</table></td></tr></table></body></html>`,
  ].join("");

  return { subject, html, text };
}
