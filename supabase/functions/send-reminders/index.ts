// Runs every 15 minutes from pg_cron (see migration 20261103000800).
//   1. Sends due rows from public.reminders to the Expo Push API.
//   2. Sends one Resend digest email per user per day, after digest_hour.
//
// Secrets (supabase secrets set ...): CRON_SECRET, RESEND_API_KEY.
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by the platform.

import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

import { buildDigest, type DigestInput } from "./digest.ts";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const EXPO_BATCH_SIZE = 100;
const MAX_REMINDERS_PER_RUN = 500;
const DIGEST_FROM = "my-app <noreply@email.blabbun.com>";

type Reminder = { id: string; user_id: string; title: string; body: string | null };
type PushTicket = { status: "ok" | "error"; details?: { error?: string } };

Deno.serve(async (req) => {
  const cronSecret = Deno.env.get("CRON_SECRET");
  if (!cronSecret || req.headers.get("x-cron-secret") !== cronSecret) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

  const reminders = await sendDueReminders(supabase);
  const digests = await sendDigests(supabase);
  return Response.json({ reminders, digests });
});

async function sendDueReminders(supabase: SupabaseClient) {
  const { data: due, error } = await supabase
    .from("reminders")
    .select("id, user_id, title, body")
    .is("sent_at", null)
    .lte("remind_at", new Date().toISOString())
    .order("remind_at")
    .limit(MAX_REMINDERS_PER_RUN);
  if (error) throw error;
  if (due.length === 0) return { sent: 0, pushed: 0 };

  const userIds = [...new Set(due.map((r: Reminder) => r.user_id))];
  const { data: tokens, error: tokenError } = await supabase
    .from("push_tokens")
    .select("user_id, token")
    .in("user_id", userIds);
  if (tokenError) throw tokenError;

  const messages = due.flatMap((r: Reminder) =>
    tokens
      .filter((t) => t.user_id === r.user_id)
      .map((t) => ({
        to: t.token,
        title: r.title,
        body: r.body ?? undefined,
        sound: "default",
        channelId: "reminders",
        data: { reminderId: r.id },
      })),
  );

  const deadTokens: string[] = [];
  for (let i = 0; i < messages.length; i += EXPO_BATCH_SIZE) {
    const batch = messages.slice(i, i + EXPO_BATCH_SIZE);
    const res = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(batch),
    });
    if (!res.ok) {
      // Leave every reminder unsent so the next run tries again.
      throw new Error(`Expo Push returned ${res.status}: ${await res.text()}`);
    }
    const { data: tickets } = (await res.json()) as { data: PushTicket[] };
    tickets.forEach((ticket, j) => {
      if (ticket.status === "error" && ticket.details?.error === "DeviceNotRegistered") {
        deadTokens.push(batch[j].to);
      }
    });
  }

  if (deadTokens.length > 0) {
    await supabase.from("push_tokens").delete().in("token", deadTokens);
  }

  // Mark sent even for users with no device: web users get the digest instead.
  const { error: updateError } = await supabase
    .from("reminders")
    .update({ sent_at: new Date().toISOString() })
    .in(
      "id",
      due.map((r: Reminder) => r.id),
    );
  if (updateError) throw updateError;

  return { sent: due.length, pushed: messages.length - deadTokens.length };
}

/** Local calendar date (YYYY-MM-DD) and hour (0-23) of an instant in a time zone. */
function localParts(date: Date, timeZone: string) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(date)
      .map((p) => [p.type, p.value]),
  );
  return { day: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour) };
}

function addDays(day: string, days: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

async function sendDigests(supabase: SupabaseClient) {
  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey) return { skipped: "RESEND_API_KEY not set" };

  const { data: settings, error } = await supabase
    .from("user_settings")
    .select("user_id, timezone, digest_hour, digest_last_sent_on")
    .eq("digest_enabled", true);
  if (error) throw error;

  const now = new Date();
  let sent = 0;
  for (const s of settings) {
    const today = localParts(now, s.timezone);
    if (today.hour < s.digest_hour || s.digest_last_sent_on === today.day) continue;

    const input = await loadDigestInput(supabase, s.user_id, s.timezone, today.day);
    const digest = buildDigest(input);

    if (digest) {
      const { data: user, error: userError } = await supabase.auth.admin.getUserById(s.user_id);
      if (userError || !user.user.email) continue;

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: DIGEST_FROM, to: [user.user.email], ...digest }),
      });
      if (!res.ok) {
        console.error(`Resend returned ${res.status}: ${await res.text()}`);
        continue;
      }
      sent += 1;
    }

    // An empty day sends nothing but still counts as done.
    await supabase.from("user_settings").update({ digest_last_sent_on: today.day }).eq("user_id", s.user_id);
  }
  return { sent };
}

async function loadDigestInput(
  supabase: SupabaseClient,
  userId: string,
  timeZone: string,
  today: string,
): Promise<DigestInput> {
  const [todos, services, renewals, doses] = await Promise.all([
    supabase
      .from("todos")
      .select("title, due_at, remind_at, priority")
      .eq("user_id", userId)
      .is("completed_at", null)
      .or("due_at.not.is.null,remind_at.not.is.null"),
    supabase
      .from("vehicle_service_due")
      .select("item, nickname, make, model")
      .eq("user_id", userId)
      .eq("status", "overdue"),
    supabase
      .from("subscriptions")
      .select("name, amount, currency, next_billing_on")
      .eq("user_id", userId)
      .eq("is_active", true)
      .gte("next_billing_on", today)
      .lte("next_billing_on", addDays(today, 7))
      .order("next_billing_on"),
    // Wide window; filtered to today in the user's time zone below.
    supabase
      .from("medicine_doses")
      .select("medicine_name, dose, scheduled_at, status")
      .eq("user_id", userId)
      .gte("scheduled_at", new Date(Date.now() - 36 * 3600 * 1000).toISOString())
      .lte("scheduled_at", new Date(Date.now() + 36 * 3600 * 1000).toISOString())
      .order("scheduled_at"),
  ]);
  for (const r of [todos, services, renewals, doses]) if (r.error) throw r.error;

  // Due today or earlier, or a reminder set for today, in the user's time zone.
  const dayOf = (iso: string | null) => (iso ? localParts(new Date(iso), timeZone).day : null);
  const todayTodos = todos.data!.filter((t) => {
    const due = dayOf(t.due_at);
    return (due !== null && due <= today) || dayOf(t.remind_at) === today;
  });

  return {
    today,
    todos: todayTodos.map((t) => ({ title: t.title, overdue: (dayOf(t.due_at) ?? today) < today })),
    services: services.data!.map((s) => ({
      item: s.item,
      vehicle: s.nickname ?? `${s.make} ${s.model}`,
    })),
    medicines: doses
      .data!.filter((d) => dayOf(d.scheduled_at) === today)
      .map((d) => ({
        name: d.medicine_name,
        dose: d.dose,
        time: new Date(d.scheduled_at).toLocaleTimeString("en-US", { timeZone, hour: "numeric", minute: "2-digit" }),
        status: d.status,
      })),
    renewals: renewals.data!.map((r) => ({
      name: r.name,
      amount: `${r.currency} ${Number(r.amount).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`,
      on: r.next_billing_on,
    })),
  };
}
