import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState, type ComponentProps, type ReactNode } from "react";
import { Pressable, ScrollView, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ExchangeRateSheet } from "@/components/money/ExchangeRateSheet";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { OptionSheet } from "@/components/ui/OptionSheet";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { useColors } from "@/lib/colors";
import { useVideos } from "@/lib/content";
import { useDebts } from "@/lib/debts";
import { documentStatus, useDocuments } from "@/lib/documents";
import { useGym } from "@/lib/gym";
import { useHabits } from "@/lib/habits";
import { useJournal } from "@/lib/journal";
import { usePeople } from "@/lib/people";
import { useShopping } from "@/lib/shopping";
import { useItems } from "@/lib/inventory";
import { useAccounts, useExchangeRates } from "@/lib/money";
import { hourLabel, timeZoneOptions, useSaveUserSettings, useUserSettings } from "@/lib/settings";
import { useVaultStore } from "@/lib/vault";
import { useAuth } from "@/providers/auth-provider";

const FOREIGN = "USD";

function SectionLabel({ children }: { children: string }) {
  return (
    <Text accessibilityRole="header" className="font-semibold text-caption uppercase tracking-wide text-ink-muted">
      {children}
    </Text>
  );
}

type RowProps = {
  title: string;
  detail: string;
  icon?: ComponentProps<typeof Ionicons>["name"];
  onPress?: () => void;
  /** Replaces the chevron, e.g. a switch. */
  trailing?: ReactNode;
  last?: boolean;
};

function Row({ title, detail, icon, onPress, trailing, last = false }: RowProps) {
  const colors = useColors();
  const content = (
    <>
      {icon ? <Ionicons name={icon} size={22} color={colors.accent} /> : null}
      <View className="min-w-0 flex-1 gap-1">
        <Text className={`text-row-title text-ink ${icon ? "font-semibold" : "font-medium"}`}>{title}</Text>
        <Text numberOfLines={1} className="font-sans text-caption text-ink-muted">
          {detail}
        </Text>
      </View>
      {trailing ?? <Ionicons name="chevron-forward" size={18} color={colors.inkMuted} />}
    </>
  );
  const className = `min-h-touch flex-row items-center gap-3 px-4 py-3 ${last ? "" : "border-b border-divider"}`;
  return onPress ? (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${detail}`}
      onPress={onPress}
      className={`${className} active:bg-surface-muted`}
    >
      {content}
    </Pressable>
  ) : (
    <View className={className}>{content}</View>
  );
}

export default function MoreScreen() {
  const colors = useColors();
  const { session, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const [sheet, setSheet] = useState<"rate" | "timezone" | null>(null);

  const items = useItems();
  const videos = useVideos();
  const debts = useDebts();
  const people = usePeople();
  const documents = useDocuments();
  const habits = useHabits();
  const gym = useGym();
  const shopping = useShopping();
  const journal = useJournal();
  const accounts = useAccounts();
  const rates = useExchangeRates();
  const settings = useUserSettings();
  const saveSettings = useSaveUserSettings();
  const vaultUnlocked = useVaultStore((s) => s.key !== null);

  const user = session?.user;
  const name = (user?.user_metadata.full_name as string | undefined) ?? user?.email ?? "Signed in";
  const provider = user?.app_metadata.provider === "google" ? "Signed in with Google" : "Signed in with email";
  const itemCount = items.data?.length;
  const usd = rates.data?.find((r) => r.currency === FOREIGN) ?? null;
  const prefs = settings.data;

  async function onSignOut() {
    setSigningOut(true);
    try {
      await signOut();
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-surface-page">
      <ScrollView contentContainerClassName="gap-5 px-5 pb-8 pt-6">
        <ScreenHeader title="More" />

        <View className="flex-row items-center gap-4 rounded-card border border-border bg-surface-card px-4 py-3">
          <View className="h-12 w-12 items-center justify-center rounded-pill bg-border">
            <Text className="font-semibold text-title text-ink">{name.charAt(0).toUpperCase()}</Text>
          </View>
          <View className="flex-1 gap-1">
            <Text className="font-semibold text-heading text-ink" numberOfLines={1}>
              {name}
            </Text>
            <Text className="font-sans text-caption text-ink-muted">{provider}</Text>
          </View>
        </View>

        {/* Modules in sections: Daily life, People, Home, Records, Work. A section shows once it has a module. */}
        <View className="gap-3">
          <SectionLabel>Daily life</SectionLabel>
          <View className="overflow-hidden rounded-card border border-border bg-surface-card">
            <Row
              icon="repeat-outline"
              title="Habits"
              detail={
                habits.data
                  ? `${habits.data.habits.length} ${habits.data.habits.length === 1 ? "habit" : "habits"}`
                  : "Streaks"
              }
              onPress={() => router.push("/habits")}
            />
            <Row
              icon="barbell-outline"
              title="Gym"
              detail={
                gym.data
                  ? `${gym.data.plans.length} workout ${gym.data.plans.length === 1 ? "day" : "days"}`
                  : "Your workout plan"
              }
              onPress={() => router.push("/gym")}
            />
            <Row
              icon="book-outline"
              title="Journal"
              detail={
                journal.data
                  ? `${journal.data.length} ${journal.data.length === 1 ? "entry" : "entries"}`
                  : "One entry a day"
              }
              onPress={() => router.push("/journal")}
              last
            />
          </View>
        </View>

        <View className="gap-3">
          <SectionLabel>People</SectionLabel>
          <View className="overflow-hidden rounded-card border border-border bg-surface-card">
            <Row
              icon="people-outline"
              title="People and dates"
              detail={
                people.data
                  ? `${people.data.people.length} ${people.data.people.length === 1 ? "person" : "people"}`
                  : "Birthdays and anniversaries"
              }
              onPress={() => router.push("/people")}
            />
            <Row
              icon="swap-horizontal-outline"
              title="Debts"
              detail={
                debts.data ? `${debts.data.filter((d) => d.balance > 0).length} open` : "Who owes you and who you owe"
              }
              onPress={() => router.push("/debts")}
              last
            />
          </View>
        </View>

        <View className="gap-3">
          <SectionLabel>Home</SectionLabel>
          <View className="overflow-hidden rounded-card border border-border bg-surface-card">
            <Row
              icon="cube-outline"
              title="Inventory"
              detail={itemCount === undefined ? "Your things" : `${itemCount} ${itemCount === 1 ? "item" : "items"}`}
              onPress={() => router.push("/inventory")}
            />
            <Row
              icon="cart-outline"
              title="Shopping list"
              detail={
                shopping.data ? `${shopping.data.items.filter((i) => !i.ticked).length} to buy` : "Grocery and hardware"
              }
              onPress={() => router.push("/shopping")}
              last
            />
          </View>
        </View>

        <View className="gap-3">
          <SectionLabel>Records</SectionLabel>
          <View className="overflow-hidden rounded-card border border-border bg-surface-card">
            <Row
              icon="document-text-outline"
              title="Documents"
              detail={
                documents.data
                  ? `${documents.data.filter((d) => documentStatus(d).tone !== "neutral").length} need attention`
                  : "Renewals and expiry dates"
              }
              onPress={() => router.push("/documents")}
            />
            <Row
              icon="lock-closed-outline"
              title="Vault"
              detail={vaultUnlocked ? "Unlocked" : "Locked"}
              onPress={() => router.push("/vault")}
              last
            />
          </View>
        </View>

        <View className="gap-3">
          <SectionLabel>Work</SectionLabel>
          <View className="overflow-hidden rounded-card border border-border bg-surface-card">
            <Row
              icon="videocam-outline"
              title="Content planner"
              detail={
                videos.data
                  ? `${videos.data.filter((v) => v.stage !== "idea" && v.stage !== "published").length} in progress`
                  : "Videos from idea to published"
              }
              onPress={() => router.push("/content")}
              last
            />
          </View>
        </View>

        <View className="gap-3">
          <SectionLabel>Settings</SectionLabel>
          <View className="overflow-hidden rounded-card border border-border bg-surface-card">
            <Row
              title="Daily email digest"
              detail={prefs ? (prefs.digestEnabled ? hourLabel(prefs.digestHour) : "Off") : "Loading…"}
              trailing={
                <Switch
                  accessibilityLabel="Daily email digest"
                  value={prefs?.digestEnabled ?? false}
                  disabled={!prefs}
                  onValueChange={(on) => saveSettings.mutate({ digestEnabled: on })}
                  trackColor={{ true: colors.accent }}
                />
              }
            />
            <Row
              title="Money accounts"
              detail={accounts.data ? accounts.data.map((a) => a.name).join(", ") : "Loading…"}
              onPress={() => router.push("/money/accounts")}
            />
            <Row
              title="Exchange rates"
              detail={usd ? `${FOREIGN} ₱${usd.rateToPhp}` : `No ${FOREIGN} rate set`}
              onPress={() => setSheet("rate")}
            />
            <Row
              title="Time zone"
              detail={prefs?.timezone ?? "Loading…"}
              onPress={prefs ? () => setSheet("timezone") : undefined}
              last
            />
          </View>
          {saveSettings.error ? <Notice tone="danger">{saveSettings.error.message}</Notice> : null}
        </View>

        <Button label="Sign out" variant="destructive" size="input" loading={signingOut} onPress={onSignOut} />
      </ScrollView>

      <ExchangeRateSheet
        visible={sheet === "rate"}
        onClose={() => setSheet(null)}
        currency={FOREIGN}
        rate={usd?.rateToPhp ?? null}
      />
      {prefs ? (
        <OptionSheet
          visible={sheet === "timezone"}
          onClose={() => setSheet(null)}
          title="Time zone"
          subtitle="Reminders and the daily digest use this time zone."
          options={timeZoneOptions(prefs.timezone)}
          value={prefs.timezone}
          onChange={(timezone) => saveSettings.mutate({ timezone })}
        />
      ) : null}
    </SafeAreaView>
  );
}
