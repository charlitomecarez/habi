import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useState, type ReactNode } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AmountInput } from "@/components/ui/AmountInput";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DashedButton } from "@/components/ui/DashedButton";
import { DateTimeField } from "@/components/ui/DateTimeField";
import { Input } from "@/components/ui/Input";
import { Notice } from "@/components/ui/Notice";
import { Segmented } from "@/components/ui/Segmented";
import { Select } from "@/components/ui/Select";
import { Sheet } from "@/components/ui/Sheet";
import { ModuleBar } from "@/components/ui/ModuleHeader";
import { useColors } from "@/lib/colors";
import { debtStatus, useDebts } from "@/lib/debts";
import { amountText, formatPeso, parseAmount, useAccounts } from "@/lib/money";
import {
  dateLabel,
  KIND_OPTIONS,
  occurrenceText,
  useAddGift,
  useBuyGift,
  useDeleteGift,
  useDeletePerson,
  useDeletePersonDate,
  usePeople,
  useSavePerson,
  useSavePersonDate,
  type GiftIdea,
  type PersonDateKind,
} from "@/lib/people";

const YEAR_OPTIONS = [
  { value: "yes", label: "Year known" },
  { value: "no", label: "No year" },
] as const;

type SheetName = "rename" | "date" | "gift" | { buy: GiftIdea } | null;

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="gap-2">
      <Text accessibilityRole="header" className="font-semibold text-heading text-ink">
        {title}
      </Text>
      {children}
    </View>
  );
}

export default function PersonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const people = usePeople();
  const debts = useDebts();
  const accounts = useAccounts();
  const savePerson = useSavePerson();
  const removePerson = useDeletePerson();
  const saveDate = useSavePersonDate();
  const removeDate = useDeletePersonDate();
  const addGift = useAddGift();
  const removeGift = useDeleteGift();
  const buyGift = useBuyGift();

  const [sheet, setSheet] = useState<SheetName>(null);
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [kind, setKind] = useState<PersonDateKind>("birthday");
  const [label, setLabel] = useState("");
  const [date, setDate] = useState<Date | null>(null);
  const [yearKnown, setYearKnown] = useState<"yes" | "no">("yes");
  const [giftTitle, setGiftTitle] = useState("");
  const [giftPrice, setGiftPrice] = useState("");
  const [accountId, setAccountId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const person = people.data?.people.find((p) => p.id === id);
  if (!person) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-surface-page px-5">
        {people.isPending ? (
          <ActivityIndicator color={colors.accent} />
        ) : (
          <View className="w-full gap-3">
            <Notice tone="danger">{people.error ? people.error.message : "This person was deleted."}</Notice>
            <Button label="Back" variant="secondary" size="input" onPress={() => router.back()} />
          </View>
        )}
      </SafeAreaView>
    );
  }

  const dates = (people.data?.dates ?? [])
    .filter((d) => d.person_id === id)
    .map((d) => ({ d, ...occurrenceText(d) }))
    .sort((a, b) => a.days - b.days);
  const gifts = (people.data?.gifts ?? []).filter((g) => g.person_id === id);
  const theirDebts = (debts.data ?? []).filter((d) => d.person_id === id);
  const accountOptions = (accounts.data ?? []).map((a) => ({ value: a.id, label: a.name }));
  const failure =
    savePerson.error ?? removePerson.error ?? saveDate.error ?? removeDate.error ?? addGift.error ?? removeGift.error;

  function open(next: SheetName) {
    setFormError(null);
    if (next === "rename") {
      setName(person!.name);
      setNote(person!.note ?? "");
    } else if (next === "date") {
      setKind("birthday");
      setLabel("");
      setDate(null);
      setYearKnown("yes");
    } else if (next === "gift") {
      setGiftTitle("");
      setGiftPrice("");
    } else if (next && typeof next === "object") {
      setGiftPrice(amountText(next.buy.price));
      setAccountId(accountId ?? accounts.data?.[0]?.id ?? null);
    }
    setSheet(next);
  }

  async function saveRename() {
    if (!name.trim()) return setFormError("Enter a name.");
    await savePerson.mutateAsync({ id, name: name.trim(), note: note.trim() || null });
    setSheet(null);
  }

  async function saveNewDate() {
    if (!date) return setFormError("Choose the date.");
    if (kind === "other" && !label.trim()) return setFormError("Name the date, for example Name day.");
    await saveDate.mutateAsync({
      input: {
        personId: id,
        kind,
        label: kind === "other" ? label.trim() : null,
        month: date.getMonth() + 1,
        day: date.getDate(),
        year: yearKnown === "yes" ? date.getFullYear() : null,
      },
    });
    setSheet(null);
  }

  async function saveGift() {
    if (!giftTitle.trim()) return setFormError("Enter the gift.");
    const price = giftPrice.trim() ? parseAmount(giftPrice) : null;
    if (giftPrice.trim() && price === null) return setFormError("Enter a price, such as 1,500.");
    await addGift.mutateAsync({ personId: id, title: giftTitle.trim(), price });
    setSheet(null);
  }

  async function saveBuy(gift: GiftIdea) {
    const amount = parseAmount(giftPrice);
    if (amount === null) return setFormError("Enter what you paid, such as 1,500.");
    if (!accountId) return setFormError("Choose the account you paid from.");
    await buyGift.mutateAsync({ giftId: gift.id, accountId, amount });
    setSheet(null);
  }

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-surface-page">
      <ModuleBar tone="people">
        <Text
          accessibilityRole="header"
          numberOfLines={1}
          className="min-w-0 flex-1 font-bold text-title text-on-shell"
        >
          {person.name}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Edit name and note"
          onPress={() => open("rename")}
          className="h-touch w-touch items-center justify-center"
        >
          <Ionicons name="create-outline" size={22} color={colors.onShell} />
        </Pressable>
      </ModuleBar>

      <ScrollView contentContainerClassName="gap-5 px-5 pb-8 pt-2">
        {failure ? <Notice tone="danger">{failure.message}</Notice> : null}
        {person.note ? <Text className="font-sans text-body text-ink">{person.note}</Text> : null}

        <Section title="Dates">
          <View>
            {dates.length === 0 ? (
              <Text className="py-3 font-sans text-caption text-ink-muted">
                No dates yet. Each date gets a reminder one week before.
              </Text>
            ) : (
              dates.map(({ d, when, days }, i) => (
                <View
                  key={d.id}
                  className={`min-h-touch flex-row items-center gap-3 py-2 pl-4 pr-1 ${i === dates.length - 1 ? "" : "border-b-2 border-border"}`}
                >
                  <View className="min-w-0 flex-1 gap-1">
                    <Text className="font-semibold text-row-title text-ink">{dateLabel(d)}</Text>
                    <Text className="font-sans text-caption text-ink-muted">{when}</Text>
                  </View>
                  {days <= 7 ? <Badge label={days === 0 ? "Today" : "This week"} tone="warning" /> : null}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Delete ${dateLabel(d)}`}
                    onPress={() => removeDate.mutate(d.id)}
                    className="h-touch w-touch items-center justify-center"
                  >
                    <Ionicons name="trash-outline" size={20} color={colors.danger} />
                  </Pressable>
                </View>
              ))
            )}
          </View>
          <DashedButton label="Add date" icon="add" onPress={() => open("date")} />
        </Section>

        <Section title="Gift ideas">
          <View>
            {gifts.length === 0 ? (
              <Text className="py-3 font-sans text-caption text-ink-muted">No gift ideas yet.</Text>
            ) : (
              gifts.map((g, i) => (
                <View
                  key={g.id}
                  className={`min-h-touch flex-row items-center gap-2 py-2 pl-4 pr-1 ${i === gifts.length - 1 ? "" : "border-b-2 border-border"}`}
                >
                  <View className="min-w-0 flex-1 gap-1">
                    <Text className={`font-semibold text-row-title ${g.bought_at ? "text-ink-muted" : "text-ink"}`}>
                      {g.title}
                    </Text>
                    <Text className="font-sans text-caption text-ink-muted">
                      {[g.bought_at ? "Bought" : null, g.price ? formatPeso(g.price) : null]
                        .filter(Boolean)
                        .join(" · ") || "No price"}
                    </Text>
                  </View>
                  {g.bought_at ? null : (
                    <Button label="Bought" variant="secondary" size="input" onPress={() => open({ buy: g })} />
                  )}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Delete ${g.title}`}
                    onPress={() => removeGift.mutate(g.id)}
                    className="h-touch w-touch items-center justify-center"
                  >
                    <Ionicons name="trash-outline" size={20} color={colors.danger} />
                  </Pressable>
                </View>
              ))
            )}
          </View>
          <DashedButton label="Add gift idea" icon="gift-outline" onPress={() => open("gift")} />
        </Section>

        <Section title="Debts">
          <View>
            {theirDebts.length === 0 ? (
              <Text className="py-3 font-sans text-caption text-ink-muted">No debts with {person.name}.</Text>
            ) : (
              theirDebts.map((d, i) => (
                <Pressable
                  key={d.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${d.direction === "owed_to_me" ? "Owes you" : "You owe"} ${formatPeso(d.balance)}, ${debtStatus(d).text}`}
                  onPress={() => router.push({ pathname: "/debts/[id]", params: { id: d.id } })}
                  className={`min-h-touch flex-row items-center gap-3 py-3 active:bg-surface-muted ${i === theirDebts.length - 1 ? "" : "border-b-2 border-border"}`}
                >
                  <View className="min-w-0 flex-1 gap-1">
                    <Text className="font-semibold text-row-title text-ink">
                      {d.direction === "owed_to_me" ? "Owes you" : "You owe"} {formatPeso(d.balance)}
                    </Text>
                    <Badge label={debtStatus(d).text} tone={debtStatus(d).tone} />
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.inkMuted} />
                </Pressable>
              ))
            )}
          </View>
          <DashedButton
            label="Add debt"
            icon="swap-horizontal-outline"
            onPress={() => router.push({ pathname: "/debts/new", params: { person: person.name } })}
          />
        </Section>

        {confirmDelete ? (
          <View className="gap-3 rounded-card border border-danger bg-danger-tint p-4">
            <Text className="font-sans text-body text-danger">
              Delete {person.name}? Their dates and gift ideas are deleted. Debts stay, with the name.
            </Text>
            <Button
              label="Delete person"
              variant="destructive"
              size="input"
              loading={removePerson.isPending}
              onPress={async () => {
                await removePerson.mutateAsync(id);
                router.back();
              }}
            />
            <Button label="Keep person" variant="secondary" size="input" onPress={() => setConfirmDelete(false)} />
          </View>
        ) : (
          <Button label="Delete person" variant="destructive" size="input" onPress={() => setConfirmDelete(true)} />
        )}
      </ScrollView>

      <Sheet visible={sheet === "rename"} onClose={() => setSheet(null)} title="Edit person">
        <Input label="Name" value={name} onChangeText={setName} maxLength={80} />
        <Input label="Note" optional value={note} onChangeText={setNote} />
        {formError ? <Notice tone="danger">{formError}</Notice> : null}
        <Button label="Save person" loading={savePerson.isPending} onPress={saveRename} />
      </Sheet>

      <Sheet visible={sheet === "date"} onClose={() => setSheet(null)} title="Add date" subtitle={person.name}>
        <Segmented label="Kind" options={KIND_OPTIONS} value={kind} onChange={setKind} />
        {kind === "other" ? (
          <Input label="Name of the date" value={label} onChangeText={setLabel} placeholder="Name day" />
        ) : null}
        <DateTimeField label="Date" mode="date" value={date} onChange={setDate} />
        <Segmented label="Year" options={YEAR_OPTIONS} value={yearKnown} onChange={setYearKnown} />
        {formError ? <Notice tone="danger">{formError}</Notice> : null}
        <Button label="Save date" loading={saveDate.isPending} onPress={saveNewDate} />
      </Sheet>

      <Sheet visible={sheet === "gift"} onClose={() => setSheet(null)} title="Add gift idea" subtitle={person.name}>
        <Input label="Gift" value={giftTitle} onChangeText={setGiftTitle} placeholder="Coffee grinder" />
        <AmountInput
          label="Price (optional)"
          unit="₱"
          unitPosition="start"
          value={giftPrice}
          onChangeText={setGiftPrice}
          inputMode="decimal"
          keyboardType="decimal-pad"
        />
        {formError ? <Notice tone="danger">{formError}</Notice> : null}
        <Button label="Save gift idea" loading={addGift.isPending} onPress={saveGift} />
      </Sheet>

      <Sheet
        visible={typeof sheet === "object" && sheet !== null}
        onClose={() => setSheet(null)}
        title="Bought the gift"
        subtitle="Adds the expense in Money."
      >
        <AmountInput
          label="Paid"
          unit="₱"
          unitPosition="start"
          value={giftPrice}
          onChangeText={setGiftPrice}
          inputMode="decimal"
          keyboardType="decimal-pad"
        />
        <Select label="From account" options={accountOptions} value={accountId} onChange={setAccountId} />
        {formError || buyGift.error ? <Notice tone="danger">{formError ?? buyGift.error?.message}</Notice> : null}
        <Button
          label="Save expense"
          loading={buyGift.isPending}
          onPress={() => typeof sheet === "object" && sheet && saveBuy(sheet.buy)}
        />
      </Sheet>
    </SafeAreaView>
  );
}
