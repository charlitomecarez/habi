import { format, parseISO } from "date-fns";
import { router } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Badge } from "@/components/ui/Badge";
import { BrandIcon } from "@/components/ui/BrandIcon";
import { Button } from "@/components/ui/Button";
import { Fab } from "@/components/ui/Fab";
import { Notice } from "@/components/ui/Notice";
import { ModuleBar } from "@/components/ui/ModuleHeader";
import { useColors } from "@/lib/colors";
import { cycleLabel, daysUntil, formatPeso, useSubscriptions, useTransactions, type Subscription } from "@/lib/money";

/** Always a word: Overdue, Due today, Due soon, Due Nov 5. */
function dueStatus(s: Subscription) {
  const days = daysUntil(s.next_billing_on);
  const date = format(parseISO(s.next_billing_on), "MMM d");
  if (days < 0) return { text: `Overdue · was due ${date}`, tone: "danger" as const };
  if (days === 0) return { text: "Due today", tone: "warning" as const };
  if (days <= 7) return { text: `Due soon · ${date}`, tone: "warning" as const };
  return { text: `Due ${date}`, tone: "neutral" as const };
}

export default function BillsScreen() {
  const colors = useColors();
  const subscriptions = useSubscriptions();
  const history = useTransactions("history");
  const bills = (subscriptions.data ?? []).filter((s) => s.kind === "bill");
  const lastPaid = (id: string) => history.data?.find((t) => t.subscription_id === id);

  function pay(s: Subscription) {
    router.push({
      pathname: "/money/transaction/new",
      params: {
        subscriptionId: s.id,
        merchant: s.name,
        ...(s.account_id ? { accountId: s.account_id } : {}),
        ...(s.category_id ? { categoryId: s.category_id } : {}),
      },
    });
  }

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-surface-page">
      <ModuleBar>
        <Text accessibilityRole="header" className="font-bold text-title text-on-shell">
          Bills
        </Text>
      </ModuleBar>

      <ScrollView contentContainerClassName="gap-5 px-5 pb-32 pt-2">
        <Text className="font-sans text-caption text-ink-muted">
          Bills whose amount changes, like Meralco, water and internet. You get a reminder before each due date and type
          the amount when you pay.
        </Text>
        {subscriptions.isPending ? (
          <ActivityIndicator color={colors.accent} className="py-8" />
        ) : subscriptions.error ? (
          <View className="gap-3">
            <Notice tone="danger">Could not load your bills. {subscriptions.error.message}</Notice>
            <Button label="Try again" variant="secondary" size="input" onPress={() => subscriptions.refetch()} />
          </View>
        ) : (
          <View className="overflow-hidden">
            {bills.length === 0 ? (
              <Text className="px-4 py-3 font-sans text-caption text-ink-muted">No bills yet.</Text>
            ) : (
              bills.map((s, i) => {
                const status = dueStatus(s);
                const last = lastPaid(s.id);
                return (
                  <View
                    key={s.id}
                    className={`gap-3 px-4 py-3 ${i === bills.length - 1 ? "" : "border-b-2 border-border"}`}
                  >
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`${s.name}, ${status.text}${last ? `, last paid ${formatPeso(last.amount)}` : ""}. Edit bill`}
                      onPress={() => router.push({ pathname: "/money/subscription/[id]", params: { id: s.id } })}
                      className="min-h-touch flex-row items-center gap-3"
                    >
                      <BrandIcon name={s.name} />
                      <View className="min-w-0 flex-1 gap-1">
                        <Text numberOfLines={1} className="font-semibold text-row-title text-ink">
                          {s.name}
                        </Text>
                        <Badge label={status.text} tone={status.tone} />
                      </View>
                      <Text className="font-sans text-caption text-ink-muted">
                        {last ? `Last ${formatPeso(last.amount)}` : cycleLabel(s.billing_cycle)}
                      </Text>
                    </Pressable>
                    <Button label={`Pay ${s.name}`} variant="secondary" size="input" onPress={() => pay(s)} />
                  </View>
                );
              })
            )}
          </View>
        )}
      </ScrollView>

      <Fab label="Add bill" onPress={() => router.push("/money/bill/new")} />
    </SafeAreaView>
  );
}
