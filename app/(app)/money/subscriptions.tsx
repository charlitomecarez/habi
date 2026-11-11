import { Ionicons } from "@expo/vector-icons";
import { format, parseISO } from "date-fns";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ExchangeRateSheet } from "@/components/money/ExchangeRateSheet";
import { Button } from "@/components/ui/Button";
import { Fab } from "@/components/ui/Fab";
import { BrandIcon } from "@/components/ui/BrandIcon";
import { Notice } from "@/components/ui/Notice";
import { ModuleBar } from "@/components/ui/ModuleHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { useColors } from "@/lib/colors";
import {
  cycleLabel,
  formatMoney,
  formatPeso,
  renewalText,
  useAccounts,
  useExchangeRates,
  useSubscriptions,
  type Subscription,
} from "@/lib/money";

const FOREIGN = "USD";

/** "monthly · ≈ ₱1,170" or "yearly · ₱149/mo". */
function costText(s: Subscription): string {
  const cycle = cycleLabel(s.billing_cycle).toLowerCase();
  if (s.currency !== "PHP") {
    return s.rateToPhp === null
      ? `${cycle} · no rate set`
      : `${cycle} · ≈ ${formatPeso(Math.round((s.amount ?? 0) * s.rateToPhp))}`;
  }
  if (s.billing_cycle !== "monthly" && s.monthlyPhp !== null) {
    return `${cycle} · ${formatPeso(Math.round(s.monthlyPhp))}/mo`;
  }
  return cycle;
}

export default function SubscriptionsScreen() {
  const colors = useColors();
  const [editingRate, setEditingRate] = useState(false);
  const subscriptions = useSubscriptions();
  const rates = useExchangeRates();
  const accounts = useAccounts();

  // Bills have their own screen.
  const list = (subscriptions.data ?? []).filter((s) => s.kind === "subscription");
  const monthly = list.reduce((sum, s) => sum + (s.monthlyPhp ?? 0), 0);
  const missingRate = list.some((s) => s.monthlyPhp === null);
  const usd = rates.data?.find((r) => r.currency === FOREIGN) ?? null;
  const accountName = (id: string | null) => accounts.data?.find((a) => a.id === id)?.name;
  const error = subscriptions.error ?? rates.error;

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-surface-page">
      <ModuleBar backLabel="Back to Money">
        <Text accessibilityRole="header" className="font-bold text-title text-ink">
          Subscriptions
        </Text>
      </ModuleBar>

      <ScrollView contentContainerClassName="gap-4 px-5 pb-fab-clear pt-2">
        {subscriptions.isPending ? (
          <Skeleton />
        ) : error ? (
          <View className="gap-3">
            <Notice tone="danger">Could not load subscriptions. {error.message}</Notice>
            <Button
              label="Try again"
              variant="secondary"
              size="input"
              onPress={() => {
                subscriptions.refetch();
                rates.refetch();
              }}
            />
          </View>
        ) : (
          <>
            <View className="flex-row items-end justify-between gap-3">
              <View className="flex-1 gap-1">
                <Text className="font-sans text-caption text-ink-muted">Per month</Text>
                <Text
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                  numberOfLines={1}
                  className="font-bold text-display text-ink"
                >
                  {formatPeso(Math.round(monthly))}
                </Text>
                <Text className="font-sans text-caption text-ink-muted">
                  {formatPeso(Math.round(monthly * 12))} a year · {list.length} active
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={usd ? `${FOREIGN} rate ₱${usd.rateToPhp}. Edit rate` : `Set the ${FOREIGN} rate`}
                onPress={() => setEditingRate(true)}
                className="h-touch justify-center"
              >
                <Text className="font-semibold text-caption text-accent">
                  {usd ? `${FOREIGN} ₱${usd.rateToPhp}` : `Set ${FOREIGN} rate`}
                </Text>
              </Pressable>
            </View>

            {missingRate ? (
              <Notice tone="warning">
                A subscription in another currency has no rate yet, so the totals leave it out. Set the {FOREIGN} rate.
              </Notice>
            ) : null}

            {list.length === 0 ? (
              <View className="items-center gap-3 py-6">
                <Ionicons name="repeat-outline" size={32} color={colors.accent} />
                <Text className="text-center font-sans text-body text-ink-muted">
                  Add your subscriptions to see what they cost and get a reminder before each renewal.
                </Text>
              </View>
            ) : (
              <View>
                {list.map((s, index) => {
                  const renewal = renewalText(s.next_billing_on);
                  const date = format(parseISO(s.next_billing_on), "MMM d");
                  const when =
                    renewal.status === "overdue"
                      ? `Overdue · was ${date}`
                      : renewal.status === "today"
                        ? "Renews today"
                        : `Renews ${date}`;
                  const caption = [when, accountName(s.account_id)].filter(Boolean).join(" · ");
                  const captionClass =
                    renewal.status === "overdue"
                      ? "font-medium text-danger"
                      : renewal.status === "later"
                        ? "font-sans text-ink-muted"
                        : "font-medium text-warning";
                  return (
                    <Pressable
                      key={s.id}
                      accessibilityRole="button"
                      accessibilityLabel={`${s.name}, ${formatMoney(s.amount ?? 0, s.currency)} ${costText(s)}, ${caption}`}
                      onPress={() => router.push({ pathname: "/money/subscription/[id]", params: { id: s.id } })}
                      className={`min-h-touch flex-row items-center gap-3 py-3 active:bg-surface-muted ${index < list.length - 1 ? "border-b-2 border-border" : ""}`}
                    >
                      <BrandIcon name={s.name} />
                      <View className="min-w-0 flex-1 gap-1">
                        <Text numberOfLines={1} className="font-semibold text-row-title text-ink">
                          {s.name}
                        </Text>
                        <Text numberOfLines={1} className={`text-caption ${captionClass}`}>
                          {caption}
                        </Text>
                      </View>
                      <View className="items-end gap-1">
                        <Text className="font-semibold text-row-title text-ink">
                          {formatMoney(s.amount ?? 0, s.currency)}
                        </Text>
                        <Text className="font-sans text-badge text-ink-muted">{costText(s)}</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            )}

            <View className="flex-row items-start gap-2">
              <Ionicons name="notifications-outline" size={16} color={colors.inkMuted} />
              <Text className="flex-1 font-sans text-caption text-ink-muted">
                You get a reminder before each renewal. Log the payment and the next date moves forward on its own.
              </Text>
            </View>
          </>
        )}
      </ScrollView>

      <Fab label="Add subscription" onPress={() => router.push("/money/subscription/new")} />

      <ExchangeRateSheet
        visible={editingRate}
        onClose={() => setEditingRate(false)}
        currency={FOREIGN}
        rate={usd?.rateToPhp ?? null}
      />
    </SafeAreaView>
  );
}
