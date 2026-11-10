import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { InboxCard } from "@/components/home/InboxCard";
import { LatestGames } from "@/components/home/LatestGames";
import { LatestNews } from "@/components/home/LatestNews";
import { ScreenTimeCard } from "@/components/home/ScreenTimeCard";
import { ShortcutsSheet } from "@/components/home/ShortcutsSheet";
import { useAdvice } from "@/components/steps/HealthCheck";
import { TipCard } from "@/components/home/TipCard";
import { WeeklyReviewCard } from "@/components/home/WeeklyReviewCard";
import { Button } from "@/components/ui/Button";
import { DataRow } from "@/components/ui/DataRow";
import { ModuleLine } from "@/components/ui/ModuleLine";
import { ProfilePhoto } from "@/components/ui/ProfilePhoto";
import { Notice } from "@/components/ui/Notice";
import { Sheet } from "@/components/ui/Sheet";
import { Skeleton } from "@/components/ui/Skeleton";
import { WeaveBand } from "@/components/ui/WeaveBand";
import { useBudgetMonths } from "@/lib/budgets";
import { useColors } from "@/lib/colors";
import { useDebts } from "@/lib/debts";
import { todaysDoses, useHealth } from "@/lib/health";
import { useHealthDaysSync } from "@/lib/health-check";
import { buildAttention, todaySentence } from "@/lib/home";
import { startHomeSummary } from "@/lib/home-summary";
import { useHabits } from "@/lib/habits";
import { dayTotals, formatPeso, toDateString, useMonthTransactions, useSubscriptions } from "@/lib/money";
import { useModuleFilter } from "@/lib/features";
import { hiddenReason, shortcutModules } from "@/lib/modules";
import { usePeople } from "@/lib/people";
import { useUserSettings } from "@/lib/settings";
import { groupTodos, useTodos } from "@/lib/todos";
import { todayChoice, useUlamDays } from "@/lib/ulam";
import { useServiceDue, useVehicle } from "@/lib/vehicles";
import { sleepMinutes, sleepRow, sleepText, useSleepLog } from "@/lib/sleep";
import { stepsAverage, useSteps } from "@/lib/steps";
import { useWeather, weatherIcon } from "@/lib/weather";
import { habitRow, moneyRow, todayIndex, todoRow, weekDays } from "@/lib/week";
import { useAuth } from "@/providers/auth-provider";
import { STRAND_WORD, type WeaveRow } from "@/lib/weave";

/** Home shows this many rows, then "See all". */
const ATTENTION_LIMIT = 5;

const STATUS_TONE = { Overdue: "over", Today: "over", "Due soon": "watch" } as const;
const STRAND_TONE = { good: "good", watch: "watch", over: "over", empty: "muted" } as const;

/** "Engine oil" reads as "engine oil" inside a sentence. "LTO renewal" keeps its capitals. */
function inSentence(title: string): string {
  return /^[A-Z][a-z]/.test(title) ? title.charAt(0).toLowerCase() + title.slice(1) : title;
}

function SectionTitle({ children }: { children: string }) {
  return (
    <Text accessibilityRole="header" className="font-semibold text-heading text-ink">
      {children}
    </Text>
  );
}

export default function HomeScreen() {
  const colors = useColors();
  const now = new Date();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const user = session?.user;
  const profileLetter = (
    ((user?.user_metadata.full_name as string | undefined) ?? user?.email ?? "?").charAt(0) || "?"
  ).toUpperCase();

  // One request for every Home row. It starts before the module queries below, which read from it.
  useState(() => startHomeSummary(now));
  const [showAll, setShowAll] = useState(false);
  const [editing, setEditing] = useState(false);
  const [openDay, setOpenDay] = useState<number | null>(null);

  const todos = useTodos();
  const vehicle = useVehicle();
  const due = useServiceDue(vehicle.data?.id);
  const subscriptions = useSubscriptions();
  const health = useHealth();
  const debts = useDebts();
  const people = usePeople();
  const month = useMonthTransactions(now);
  const settings = useUserSettings();
  const budgets = useBudgetMonths(now);
  const habits = useHabits();
  const ulamDays = useUlamDays();
  const weather = useWeather();
  const sleepLog = useSleepLog();
  const steps = useSteps();
  const advice = useAdvice(now);
  useHealthDaysSync();
  // From 6 PM to midnight, while today's advice exists.
  const adviceToday = advice.state.kind === "today" ? advice.state.insight : null;

  const openToday = groupTodos(todos.data ?? [], now).today.filter((t) => !t.completed_at);
  const bills = subscriptions.data ?? [];
  const items = buildAttention(
    {
      services: vehicle.data ? (due.data ?? []) : [],
      vehicleLabel: vehicle.data ? (vehicle.data.nickname ?? vehicle.data.model) : undefined,
      todos: openToday,
      bills,
      doses: health.data ? todaysDoses(health.data.doses, now) : [],
      debts: debts.data ?? [],
      people: people.data?.people ?? [],
      dates: people.data?.dates ?? [],
    },
    now,
  );
  const visible = showAll ? items : items.slice(0, ATTENTION_LIMIT);

  const totals = dayTotals(month.data ?? []);
  const spentToday = totals.byDay.get(toDateString(now))?.spent ?? 0;
  const budgetTotal = (budgets ?? []).reduce((sum, b) => sum + b.available, 0);
  const moneyLeft = (budgets ?? []).reduce((sum, b) => sum + b.left, 0);
  const hasBudget = (budgets ?? []).length > 0;

  const spentByDay = new Map([...totals.byDay].map(([day, t]) => [day, t.spent]));
  const rows: WeaveRow[] = [
    ...(hasBudget ? [moneyRow(spentByDay, budgetTotal, now)] : []),
    todoRow(todos.data ?? [], now),
    habitRow(habits.data?.habits ?? [], habits.data?.checks ?? new Map(), now),
    sleepRow(sleepLog.data ?? {}, now),
  ];

  const ulamRow = ulamDays.data?.find((d) => d.on_date === toDateString(now));
  const ulamLimit = settings.data?.ulamLimit ?? 99;
  const { ulam } = todayChoice(ulamRow, now, ulamLimit);

  const shortcutIds = settings.data?.homeShortcuts ?? [];
  const moduleFilter = useModuleFilter();
  // A module the server cannot run, or that you switched off, leaves Home too.
  const shortcuts = shortcutModules(shortcutIds).filter((m) => hiddenReason(m, moduleFilter) === null);

  const loading = todos.isPending || vehicle.isPending;
  const error = todos.error ?? vehicle.error ?? due.error ?? subscriptions.error ?? debts.error ?? people.error;

  const forecast = weather.data?.forecast;
  const today = format(now, "EEEE, MMM d");
  const lineIcon = weatherIcon(forecast?.code, forecast?.isDay);
  const noPlace = weather.data !== undefined && weather.data.place === null;
  const weatherLine = forecast
    ? `${today} · ${forecast.temperature}° · Rain ${forecast.rain}%`
    : noPlace
      ? `${today} · Add your weather`
      : today;

  const stepWeek = steps.data?.week ?? [];
  const stepsToday = stepWeek[stepWeek.length - 1] ?? 0;
  const lastNight = sleepLog.data?.[toDateString(now)];

  const first = items[0];
  const [refreshing, setRefreshing] = useState(false);
  const refresh = async () => {
    setRefreshing(true);
    startHomeSummary(new Date(), true);
    await Promise.all([
      todos.refetch(),
      vehicle.refetch(),
      due.refetch(),
      subscriptions.refetch(),
      debts.refetch(),
      people.refetch(),
    ]);
    setRefreshing(false);
  };
  const firstRun = !loading && !error && items.length === 0 && (todos.data ?? []).length === 0;
  const sentence = loading
    ? "Checking your day"
    : error
      ? "I could not load your day."
      : firstRun
        ? "I have nothing to tell you yet."
        : items.length === 0
          ? "Nothing is due today."
          : todaySentence(items);
  const showAmount = !loading && !error && !firstRun;

  return (
    <View className="flex-1 bg-surface-page">
      <ScrollView
        contentContainerClassName="gap-6 pb-8"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.accent} />}
      >
        <View>
          <View className="gap-1 bg-shell px-5 pb-2" style={{ paddingTop: insets.top + 8 }}>
            <View className="flex-row items-center gap-3">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Weather. ${weatherLine}`}
                onPress={() => router.push("/weather")}
                className="min-h-touch min-w-0 flex-1 justify-center"
              >
                <View className="flex-row items-center gap-2">
                  {lineIcon ? <Ionicons name={lineIcon} size={18} color={colors.onShell} /> : null}
                  <Text className="min-w-0 shrink font-sans text-label text-on-shell">{weatherLine}</Text>
                </View>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="More and settings"
                onPress={() => router.push("/more")}
                className="h-touch w-touch items-center justify-center"
              >
                <View className="h-8 w-8 items-center justify-center overflow-hidden rounded-pill border-2 border-on-shell bg-on-shell">
                  <ProfilePhoto letter={profileLetter} letterClassName="font-bold text-label text-shell" size={28} />
                </View>
              </Pressable>
            </View>
            <Text
              accessibilityRole="header"
              adjustsFontSizeToFit
              minimumFontScale={0.7}
              numberOfLines={4}
              className="font-bold text-say text-on-shell"
            >
              {sentence}
              {showAmount ? (
                <>
                  {" "}
                  <Text className="text-watch-fill">{formatPeso(hasBudget ? moneyLeft : spentToday)}</Text>
                  {hasBudget ? " left this month." : " spent today."}
                </>
              ) : null}
            </Text>
            {first && showAmount ? (
              <Pressable
                accessibilityRole="link"
                onPress={() => router.push(first.href)}
                className="h-touch justify-center"
              >
                <Text className="font-semibold text-label text-on-shell underline">Open {inSentence(first.title)}</Text>
              </Pressable>
            ) : null}
          </View>
          <WeaveBand rows={rows} todayIndex={todayIndex(now)} onDayPress={setOpenDay} />
        </View>

        <View className="gap-6 px-5">
          {error ? (
            <Notice tone="danger">
              {todos.error ? "Could not load todos." : "Could not load everything."} Check your connection, then pull
              down to try again.
            </Notice>
          ) : null}

          {firstRun ? (
            <View className="gap-3">
              <Text className="font-bold text-title text-ink">Add one todo to start</Text>
              <Text className="font-sans text-body text-ink-muted">
                I tell you what needs action here. The band fills as you log.
              </Text>
              <Button label="Add todo" onPress={() => router.push("/todo/new")} />
            </View>
          ) : loading ? (
            <Skeleton rows={3} />
          ) : (
            <View>
              {visible.map((item) => (
                <DataRow
                  key={item.key}
                  title={item.title}
                  detail={item.detail}
                  value={item.value}
                  status={{ label: item.status, tone: item.quiet ? "muted" : STATUS_TONE[item.status] }}
                  onPress={() => router.push(item.href)}
                />
              ))}
              {items.length > ATTENTION_LIMIT ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setShowAll(!showAll)}
                  className="h-touch items-center justify-center"
                >
                  <Text className="font-semibold text-label text-accent">
                    {showAll ? "Show less" : `See all ${items.length}`}
                  </Text>
                </Pressable>
              ) : null}
              <DataRow
                title={ulam.name}
                detail="Today's ulam"
                value={formatPeso(ulam.cost)}
                status={
                  error ? { label: "Saved on this phone", tone: "muted" } : { label: "Under limit", tone: "good" }
                }
                onPress={() => router.push("/ulam")}
              />
              <DataRow
                title={steps.data?.access ? "Steps" : "Sleep"}
                detail={
                  lastNight
                    ? `Slept ${sleepText(sleepMinutes(lastNight))}${lastNight.source === "health_connect" ? " · From Samsung Health" : ""}`
                    : "No sleep found"
                }
                value={steps.data?.access ? stepsToday.toLocaleString("en-PH") : undefined}
                status={
                  steps.data?.access && stepsToday >= stepsAverage(stepWeek)
                    ? { label: "On track", tone: "good" }
                    : undefined
                }
                onPress={() => router.push("/steps")}
                last={!adviceToday}
              />
              {adviceToday ? (
                <DataRow
                  title="Your health check is ready"
                  detail={`${adviceToday.tips.length} ${adviceToday.tips.length === 1 ? "tip" : "tips"} · Sleep, steps and weight`}
                  onPress={() => router.push("/steps")}
                  chevron
                  last
                />
              ) : null}
            </View>
          )}

          <InboxCard />

          <ScreenTimeCard />

          <View>
            <View className="flex-row items-center justify-between">
              <SectionTitle>Shortcuts</SectionTitle>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Edit shortcuts"
                onPress={() => setEditing(true)}
                className="h-touch justify-center pl-3"
              >
                <Text className="font-semibold text-label text-accent">Edit</Text>
              </Pressable>
            </View>
            {shortcuts.length === 0 ? (
              <Text className="font-sans text-caption text-ink-muted">Tap Edit to pin the modules you use most.</Text>
            ) : (
              <View className="flex-row flex-wrap">
                {shortcuts.map((m) => (
                  <ModuleLine
                    key={m.id}
                    label={m.label}
                    icon={m.icon}
                    tone={m.tone}
                    onPress={() => router.push(m.href)}
                  />
                ))}
              </View>
            )}
          </View>

          <LatestGames ready={!loading} />
          <LatestNews ready={!loading} />

          <WeeklyReviewCard />
          <TipCard />
        </View>
      </ScrollView>

      <ShortcutsSheet visible={editing} onClose={() => setEditing(false)} selected={shortcutIds} />
      <Sheet
        visible={openDay !== null}
        onClose={() => setOpenDay(null)}
        title={openDay !== null ? format(weekDays(now)[openDay], "EEEE, MMM d") : ""}
        subtitle="The week band, in words"
      >
        {openDay !== null
          ? rows.map((row, index) => (
              <DataRow
                key={row.label}
                title={row.label}
                detail={row.details?.[openDay]}
                status={{ label: STRAND_WORD[row.days[openDay]], tone: STRAND_TONE[row.days[openDay]] }}
                last={index === rows.length - 1}
              />
            ))
          : null}
      </Sheet>
    </View>
  );
}
