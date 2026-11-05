import { format } from "date-fns";
import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AttentionCard } from "@/components/home/AttentionCard";
import { ScreenTimeCard } from "@/components/home/ScreenTimeCard";
import { ShortcutsSheet } from "@/components/home/ShortcutsSheet";
import { TipCard } from "@/components/home/TipCard";
import { WeeklyReviewCard } from "@/components/home/WeeklyReviewCard";
import { HeroCard } from "@/components/ui/HeroCard";
import { ModuleTile } from "@/components/ui/ModuleTile";
import { FadeIn } from "@/components/ui/Motion";
import { Notice } from "@/components/ui/Notice";
import { ProfilePhoto } from "@/components/ui/ProfilePhoto";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { useColors } from "@/lib/colors";
import { useDebts } from "@/lib/debts";
import { todaysDoses, useHealth } from "@/lib/health";
import { billsThisWeek, buildAttention, todaySentence } from "@/lib/home";
import { dayTotals, formatPeso, toDateString, useMonthTransactions, useSubscriptions } from "@/lib/money";
import { shortcutModules } from "@/lib/modules";
import { usePeople } from "@/lib/people";
import { useUserSettings } from "@/lib/settings";
import { groupTodos, useTodos } from "@/lib/todos";
import { useServiceDue, useVehicle } from "@/lib/vehicles";
import { useAuth } from "@/providers/auth-provider";

/** Needs attention shows this many, then "See all". */
const ATTENTION_LIMIT = 5;

function greeting(now: Date): string {
  const hour = now.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
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
  const { session } = useAuth();
  const now = new Date();
  const fullName = session?.user.user_metadata.full_name as string | undefined;
  const firstName = fullName?.split(" ")[0];
  const initial = (firstName ?? session?.user.email ?? "?").charAt(0).toUpperCase();

  const [showAll, setShowAll] = useState(false);
  const [editing, setEditing] = useState(false);

  const todos = useTodos();
  const vehicle = useVehicle();
  const due = useServiceDue(vehicle.data?.id);
  const subscriptions = useSubscriptions();
  const health = useHealth();
  const debts = useDebts();
  const people = usePeople();
  const month = useMonthTransactions(now);
  const settings = useUserSettings();

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

  const spentToday = dayTotals(month.data ?? []).byDay.get(toDateString(now))?.spent ?? 0;
  const shortcutIds = settings.data?.homeShortcuts ?? [];
  const shortcuts = shortcutModules(shortcutIds);

  const loading = todos.isPending || vehicle.isPending;
  const error = todos.error ?? vehicle.error ?? due.error ?? subscriptions.error ?? debts.error ?? people.error;

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-surface-page">
      <ScrollView contentContainerClassName="gap-6 px-5 pb-8 pt-6">
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1 gap-1">
            <Text className="font-sans text-label text-ink-muted">{format(now, "EEEE, MMMM d")}</Text>
            <ScreenHeader title={firstName ? `${greeting(now)}, ${firstName}` : greeting(now)} />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Settings"
            onPress={() => router.push("/more")}
            className="h-touch w-touch items-center justify-center overflow-hidden rounded-pill bg-border"
          >
            <ProfilePhoto letter={initial} letterClassName="font-semibold text-body text-ink" />
          </Pressable>
        </View>

        <HeroCard
          title={loading ? "Checking your day" : todaySentence(items)}
          stats={[
            { value: formatPeso(spentToday), label: "spent today" },
            { value: String(openToday.length), label: openToday.length === 1 ? "todo left" : "todos left" },
            { value: formatPeso(billsThisWeek(bills, now)), label: "bills this week" },
          ]}
        />

        <View className="gap-3">
          <SectionTitle>Needs attention</SectionTitle>
          {error ? <Notice tone="danger">Could not load everything. {error.message}</Notice> : null}
          {loading ? (
            <ActivityIndicator color={colors.accent} className="py-4" />
          ) : items.length === 0 ? (
            <View className="rounded-card border border-border bg-surface-card px-4 py-3">
              <Text className="font-sans text-caption text-ink-muted">Nothing is due today.</Text>
            </View>
          ) : (
            <FadeIn>
              <View className="gap-3">
                {visible.map((item) => (
                  <AttentionCard key={item.key} item={item} />
                ))}
              </View>
            </FadeIn>
          )}
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
        </View>

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
          <ScreenTimeCard />
        </View>
      </ScrollView>

      <ShortcutsSheet visible={editing} onClose={() => setEditing(false)} selected={shortcutIds} />
    </SafeAreaView>
  );
}
