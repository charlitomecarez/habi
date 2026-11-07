// Proves on the live project that one account cannot reach the rows of another.
// It signs in with the anon key only, touches only the rows it adds, and deletes them.
//
// Run with two test accounts, and keep the passwords out of .env:
//   RLS_A_EMAIL=... RLS_A_PASSWORD=... RLS_B_EMAIL=... RLS_B_PASSWORD=... \
//     node --env-file=.env scripts/rls-check.mjs

import { readFileSync } from "node:fs";

import { createClient } from "@supabase/supabase-js";

const FAR = "2099-01-01";
const AT = "2099-01-01T00:00:00Z";
const LABEL = "rls-test";

// Parents come first. `from` names the seed that gives a foreign key its value.
const SEEDS = [
  { table: "content_videos", row: { title: LABEL } },
  { table: "daily_tips", row: { on_date: FAR, tip: LABEL, topic: LABEL } },
  { table: "debts", row: { amount: 1, direction: "owed_to_me", person_name: LABEL } },
  { table: "debt_payments", row: { amount: 1 }, from: { debt_id: "debts" } },
  { table: "documents", row: { name: LABEL } },
  { table: "habits", row: { name: LABEL } },
  { table: "habit_checks", row: { on_date: FAR }, from: { habit_id: "habits" } },
  { table: "health_visits", row: { notes: LABEL } },
  { table: "inventory_locations", row: { name: LABEL } },
  { table: "inventory_items", row: { name: LABEL } },
  { table: "journal_entries", row: { on_date: FAR } },
  { table: "medicines", row: { name: LABEL } },
  { table: "medicine_doses", row: { medicine_name: LABEL, scheduled_at: AT }, from: { medicine_id: "medicines" } },
  { table: "money_accounts", row: { name: LABEL } },
  { table: "money_categories", row: { name: LABEL } },
  { table: "money_budgets", row: { monthly_limit: 1 }, from: { category_id: "money_categories" } },
  { table: "transactions", row: { amount: 1 }, from: { account_id: "money_accounts" } },
  {
    table: "recurring_transactions",
    row: { name: LABEL, amount: 1, schedule: "daily", is_paused: true },
    from: { account_id: "money_accounts" },
  },
  { table: "savings_goals", row: { name: LABEL, target_amount: 1 } },
  { table: "savings_contributions", row: { amount: 1 }, from: { goal_id: "savings_goals" } },
  { table: "subscriptions", row: { name: LABEL, next_billing_on: FAR } },
  { table: "people", row: { name: LABEL } },
  { table: "gift_ideas", row: { title: LABEL }, from: { person_id: "people" } },
  { table: "person_dates", row: { day: 1, month: 1 }, from: { person_id: "people" } },
  { table: "push_tokens", row: { token: LABEL } },
  { table: "reminders", row: { remind_at: AT, title: LABEL } },
  { table: "shopping_items", row: { name: LABEL } },
  { table: "shopping_history", row: { name: LABEL } },
  { table: "todos", row: { title: LABEL } },
  { table: "trips", row: { end_date: FAR, start_date: FAR, title: LABEL } },
  { table: "trip_items", row: { title: LABEL }, from: { trip_id: "trips" } },
  { table: "ulam_days", row: { on_date: FAR } },
  { table: "vault_entries", row: { ciphertext: LABEL, nonce: LABEL } },
  { table: "vehicles", row: { make: LABEL, model: LABEL } },
  { table: "vehicle_services", row: { item: LABEL }, from: { vehicle_id: "vehicles" } },
  {
    table: "fuel_logs",
    row: { litres: 1, odometer_km: 1, price_per_litre: 1, total: 1 },
    from: { vehicle_id: "vehicles" },
  },
  { table: "odometer_logs", row: { odometer_km: 1 }, from: { vehicle_id: "vehicles" } },
  { table: "service_logs", row: { odometer_km: 1 }, from: { vehicle_id: "vehicles" } },
  { table: "weight_logs", row: { weight_kg: 1 } },
  { table: "workout_plans", row: { name: LABEL } },
  { table: "workout_exercises", row: { name: LABEL }, from: { plan_id: "workout_plans" } },
  { table: "workout_sessions", row: { on_date: FAR, plan_name: LABEL } },
  {
    table: "workout_sets",
    row: { exercise_name: LABEL, reps: 1, set_number: 1 },
    from: { session_id: "workout_sessions" },
  },
];

// The app cannot write these, or each account holds one fixed row. Account B must still read none of A's rows.
// feedback rows cannot be deleted, so the script adds none there.
const READ_ONLY = [
  "app_admins",
  "exchange_rates",
  "feedback",
  "user_settings",
  "vault_settings",
  "voice_access",
  "voice_messages",
];

/** Every public table with a user_id column, from the generated types. */
function ownedTables() {
  const source = readFileSync("types/database.ts", "utf8");
  const start = source.indexOf("Tables: {", source.indexOf("\n  public: {"));
  const body = source.slice(start, source.indexOf("\n    Views: {", start));
  const found = body.matchAll(/^ {6}(\w+): \{\n {8}Row: \{\n([\s\S]*?)^ {8}\};/gm);
  return [...found].filter((m) => /^\s+user_id:/m.test(m[2])).map((m) => m[1]);
}

async function signIn(letter, email, password) {
  if (!email || !password) throw new Error(`Set the email and the password of account ${letter}.`);
  const client = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`Account ${letter} could not sign in: ${error.message}`);
  return { client, id: data.user.id };
}

const failures = [];
const fail = (table, what) => failures.push(`${table}: ${what}`);

async function checkSeed(seed, a, b, added) {
  const row = { ...seed.row };
  for (const [column, parent] of Object.entries(seed.from ?? {})) row[column] = added.get(parent);

  const { data, error } = await a.client.from(seed.table).insert(row).select("id").single();
  if (error) return fail(seed.table, `account A could not add a row (${error.message})`);
  const id = data.id;
  added.set(seed.table, id);

  const read = await b.client.from(seed.table).select("id").eq("id", id);
  if (read.data?.length) fail(seed.table, "account B read the row");

  const column = Object.keys(seed.row)[0];
  const changed = await b.client
    .from(seed.table)
    .update({ [column]: seed.row[column] })
    .eq("id", id)
    .select("id");
  if (changed.data?.length) fail(seed.table, "account B changed the row");

  const removed = await b.client.from(seed.table).delete().eq("id", id).select("id");
  if (removed.data?.length) fail(seed.table, "account B deleted the row");

  const forged = await b.client
    .from(seed.table)
    .insert({ ...row, user_id: a.id })
    .select("id");
  if (!forged.error) {
    fail(seed.table, "account B added a row as account A");
    await a.client.from(seed.table).delete().eq("id", forged.data[0].id);
  }

  // A child row of B must not point at a parent of A.
  if (seed.from) {
    const crossed = await b.client.from(seed.table).insert(row).select("id");
    if (!crossed.error) {
      fail(seed.table, "account B linked a row to a parent of account A");
      await b.client.from(seed.table).delete().eq("id", crossed.data[0].id);
    }
  }

  const kept = await a.client.from(seed.table).select("id").eq("id", id);
  if (kept.data?.length !== 1) fail(seed.table, "account A lost the row");
}

async function main() {
  const a = await signIn("A", process.env.RLS_A_EMAIL, process.env.RLS_A_PASSWORD);
  const b = await signIn("B", process.env.RLS_B_EMAIL, process.env.RLS_B_PASSWORD);
  if (a.id === b.id) throw new Error("Use two different accounts.");

  const covered = new Set([...SEEDS.map((s) => s.table), ...READ_ONLY]);
  const missing = ownedTables().filter((t) => !covered.has(t));
  if (missing.length) throw new Error(`Add a seed for: ${missing.join(", ")}`);

  const added = new Map();
  try {
    for (const seed of SEEDS) await checkSeed(seed, a, b, added);
    for (const table of READ_ONLY) {
      const { data } = await b.client.from(table).select("user_id").eq("user_id", a.id);
      if (data?.length) fail(table, "account B read a row of account A");
    }
  } finally {
    for (const seed of [...SEEDS].reverse()) {
      const id = added.get(seed.table);
      if (!id) continue;
      const { error } = await a.client.from(seed.table).delete().eq("id", id);
      if (error) fail(seed.table, `the test row stayed (${error.message})`);
    }
  }

  console.log(`Tables with a row test: ${added.size}. Read-only tables: ${READ_ONLY.length}.`);
  if (failures.length) {
    console.error(failures.join("\n"));
    process.exit(1);
  }
  console.log("Account B reached no row of account A.");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
