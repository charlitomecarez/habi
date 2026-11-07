import { format } from "date-fns";
import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { InboxCard } from "@/components/home/InboxCard";
import { ScreenTimeCard } from "@/components/home/ScreenTimeCard";
import { ShortcutsSheet } from "@/components/home/ShortcutsSheet";
import { TipCard } from "@/components/home/TipCard";
import { WeeklyReviewCard } from "@/components/home/WeeklyReviewCard";
import { Button } from "@/components/ui/Button";
import { DataRow } from "@/components/ui/DataRow";
import { ModuleTile } from "@/components/ui/ModuleTile";
import { Notice } from "@/components/ui/Notice";
import { ProfilePhoto } from "@/components/ui/ProfilePhoto";
import { Sheet } from "@/components/ui/Sheet";
import { WeaveBand } from "@/components/ui/WeaveBand";
import { useBudgetMonths } from "@/lib/budgets";
import { useColors } from "@/lib/colors";
import { useDebts } from "@/lib/debts";
import { todaysDoses, useHealth } from "@/lib/health";
import { buildAttention, todaySentence } from "@/lib/home";
import { useHabits } from "@/lib/habits";
import { dayTotals, formatPeso, toDateString, useMonthTransactions, useSubscriptions } from "@/lib/money";
import { shortcutModules } from "@/lib/modules";
import { usePeople } from "@/lib/people";
import { useUserSettings } from "@/lib/settings";
import { groupTodos, useTodos } from "@/lib/todos";
import { todayChoice, useUlamDays } from "@/lib/ulam";
import { useServiceDue, useVehicle } from "@/lib/vehicles";
import { habitRow, moneyRow, todayIndex, todoRow, weekDays } from "@/lib/week";
import { STRAND_WORD, type WeaveRow } from "@/lib/weave";
import { useAuth } from "@/providers/auth-provider";

/** Home shows this many rows, then "See all". */
const ATTENTION_LIMIT = 5;

const STATUS_TONE = { Overdue: "over", Today: "watch", "Due soon": "watch" } as const;
const STRAND_TONE = { good: "good", watch: "watch", over: "over", empty: "muted" } as const;

function SectionTitle({ children }: { children: string }) {
  return (
    <Text accessibilityRole="header" className="font-semibold text-heading text-ink">
      {children}
    </Text>
  );
}

export default function HomeScreen() {
  const colors = useColors();
  const { session } = useAuth();
  const now = new Date();
  const fullName = session?.user.user_metadata.full_name as string | undefined;
  const initial = (fullName ?? session?.user.email ?? "?").charAt(0).toUpperCase();
  const insets = useSafeAreaInsets();

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

  const openToday = groupTodos(todos.data ?? [], now).today.filter((t) => !t.completed_at);
  const bills = subscriptions.data ?? [];
  const items = buildAttention(
    {
      services: vehicle.data ? (due.data ?? []) : [],
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
  ];

  const ulamRow = ulamDays.data?.find((d) => d.on_date === toDateString(now));
  const ulamLimit = settings.data?.ulamLimit ?? 99;
  const { ulam } = todayChoice(ulamRow, now, ulamLimit);

  const shortcutIds = settings.data?.homeShortcuts ?? [];
  const shortcuts = shortcutModules(shortcutIds);

  const loading = todos.isPending || vehicle.isPending;
  const error = todos.error ?? vehicle.error ?? due.error ?? subscriptions.error ?? debts.error ?? people.error;

  const first = items[0];
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

  return (
    <View className="flex-1 bg-surface-page">
      <ScrollView contentContainerClassName="gap-6 pb-8">
        <View>
          <View className="gap-1 bg-shell px-4 pb-2" style={{ paddingTop: insets.top + 8 }}>
            <View className="flex-row items-center justify-between gap-3">
              <Text className="min-w-0 flex-1 font-sans text-label text-on-shell">{format(now, "EEEE, MMM d")}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Settings"
                onPress={() => router.push("/more")}
                className="h-touch w-touch items-center justify-center overflow-hidden rounded-pill bg-on-shell"
              >
                <ProfilePhoto letter={initial} letterClassName="font-semibold text-body text-shell" />
              </Pressable>
            </View>
            <Text
              accessibilityRole="header"
              adjustsFontSizeToFit
              minimumFontScale={0.7}
              numberOfLines={3}
              className="font-bold text-say text-on-shell"
            >
              {sentence}
            </Text>
            <Text className="font-bold text-amount text-watch-fill">
              {hasBudget ? `${formatPeso(moneyLeft)} left this month` : `${formatPeso(spentToday)} spent today`}
            </Text>
            {first ? (
              <Pressable
                accessibilityRole="link"
                onPress={() => router.push(first.href)}
                className="h-touch justify-center"
              >
                <Text className="font-semibold text-label text-on-shell underline">Open {first.title}</Text>
              </Pressable>
            ) : null}
          </View>
          <WeaveBand rows={rows} todayIndex={todayIndex(now)} onDayPress={(_, day) => setOpenDay(day)} />
        </View>

        <View className="gap-6 px-5">
          <InboxCard />

          {error ? (
            <Notice tone="danger">Could not load everything. Check your connection, then try again.</Notice>
          ) : null}

          {firstRun ? (
            <View className="gap-3">
              <Text className="font-bold text-title text-ink">Add one todo to start</Text>
              <Text className="font-sans text-body text-ink-muted">
                I tell you what needs action here. The band fills as you log.
              </Text>
              <Button label="Add todo" onPress={() => router.push("/todo/new")} />
            </View>
          ) : (
            <View>
              {loading ? <ActivityIndicator color={colors.accent} className="py-4" /> : null}
              {visible.map((item) => (
                <DataRow
                  key={item.key}
                  title={item.title}
                  detail={item.detail}
                  status={{ label: item.status, tone: STATUS_TONE[item.status] }}
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
                status={{ label: "Under limit", tone: "good" }}
                onPress={() => router.push("/ulam")}
                last
              />
            </View>
          )}

          <ScreenTimeCard />

          <View className="gap-3">
            <View className="flex-row items-center justify-between">
              <SectionTitle>Shortcuts</SectionTitle>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Edit shortcuts"
                onPress={() => setEditing(true)}
                className="h-touch justify-center px-2"
              >
                <Text className="font-semibold text-label text-accent">Edit</Text>
              </Pressable>
            </View>
            {shortcuts.length === 0 ? (
              <Text className="font-sans text-caption text-ink-muted">Tap Edit to pin the modules you use most.</Text>
            ) : (
              <View className="flex-row flex-wrap gap-y-3">
                {shortcuts.map((m) => (
                  <ModuleTile
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

          <View className="gap-3">
            <SectionTitle>This week</SectionTitle>
            <WeeklyReviewCard />
            <TipCard />
          </View>
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
