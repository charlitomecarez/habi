import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { ErrorNotice } from "@/components/ui/ErrorNotice";
import { Input } from "@/components/ui/Input";
import { KeyboardAvoidingView } from "@/components/ui/KeyboardAvoidingView";
import { KeyboardScrollView } from "@/components/ui/KeyboardScrollView";
import { Notice } from "@/components/ui/Notice";
import { Select } from "@/components/ui/Select";
import { Sheet } from "@/components/ui/Sheet";
import { ModuleBar } from "@/components/ui/ModuleHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { SwipeRow } from "@/components/ui/SwipeRow";
import { useColors } from "@/lib/colors";
import { errorText } from "@/lib/errors";
import { tick } from "@/lib/haptics";
import { amountText, formatPeso, parseBalance, useAccounts, useCategories } from "@/lib/money";
import { useAddItem, useCheckout, useRemoveItem, useShopping, useUpdateItem, type ShoppingItem } from "@/lib/shopping";
import { showSnackbar } from "@/lib/snackbar";

const NONE = "none";

function ItemRow({ item, last }: { item: ShoppingItem; last: boolean }) {
  const colors = useColors();
  const update = useUpdateItem();
  const remove = useRemoveItem();
  const [price, setPrice] = useState(amountText(item.price));

  function savePrice() {
    const value = price.trim() ? parseBalance(price) : null;
    if (value !== null && value < 0) return;
    if (value !== item.price) update.mutate({ id: item.id, patch: { price: value } });
  }

  const setTicked = (ticked: boolean) => {
    if (ticked) tick();
    update.mutate(
      { id: item.id, patch: { ticked } },
      { onError: (e) => showSnackbar({ text: `Could not save. ${errorText(e)}`, tone: "error" }) },
    );
  };
  return (
    <SwipeRow
      actions={[
        item.ticked
          ? { label: "Not bought", icon: "arrow-undo-outline", tone: "primary", onPress: () => setTicked(false) }
          : { label: "Bought", icon: "cart-outline", tone: "primary", onPress: () => setTicked(true) },
      ]}
    >
      <View className={`flex-row items-center gap-1 py-1 pr-1 ${last ? "" : "border-b-2 border-border"}`}>
        <Pressable
          accessibilityRole="checkbox"
          accessibilityLabel={`${item.name}${item.quantity ? `, ${item.quantity}` : ""}, in the cart`}
          accessibilityState={{ checked: item.ticked }}
          onPress={() => setTicked(!item.ticked)}
          className="min-h-touch min-w-0 flex-1 flex-row items-center gap-3 pl-4"
        >
          <Ionicons
            name={item.ticked ? "checkbox" : "square-outline"}
            size={22}
            color={item.ticked ? colors.accent : colors.inkMuted}
          />
          <View className="min-w-0 flex-1">
            <Text
              numberOfLines={1}
              className={`font-medium text-row-title ${item.ticked ? "text-ink-muted line-through" : "text-ink"}`}
            >
              {item.name}
            </Text>
            {item.quantity ? <Text className="font-sans text-caption text-ink-muted">{item.quantity}</Text> : null}
          </View>
        </Pressable>
        <TextInput
          accessibilityLabel={`Price of ${item.name} in pesos`}
          value={price}
          onChangeText={setPrice}
          onBlur={savePrice}
          onSubmitEditing={savePrice}
          placeholder="₱"
          placeholderTextColor={colors.inkMuted}
          inputMode="decimal"
          keyboardType="decimal-pad"
          className="h-touch w-field-sm rounded-sm border border-border-input bg-surface-card px-2 text-right font-sans text-body text-ink"
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Add ${item.name} to Inventory`}
          onPress={() => router.push({ pathname: "/inventory/item/new", params: { name: item.name } })}
          className="h-touch w-touch items-center justify-center"
        >
          <Ionicons name="cube-outline" size={20} color={colors.ink} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Remove ${item.name}`}
          onPress={() => remove.mutate(item.id)}
          className="h-touch w-touch items-center justify-center"
        >
          <Ionicons name="close" size={20} color={colors.inkMuted} />
        </Pressable>
      </View>
    </SwipeRow>
  );
}

export default function ShoppingScreen() {
  const shopping = useShopping();
  const add = useAddItem();
  const checkout = useCheckout();
  const accounts = useAccounts();
  const categories = useCategories();
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [paying, setPaying] = useState(false);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string>(NONE);
  const [store, setStore] = useState("");
  const [done, setDone] = useState<string | null>(null);

  const items = shopping.data?.items ?? [];
  const toBuy = items.filter((i) => !i.ticked);
  const inCart = items.filter((i) => i.ticked);
  const total = inCart.reduce((s, i) => s + (i.price ?? 0), 0);
  const typed = name.trim().toLowerCase();
  const onList = new Set(items.map((i) => i.name.toLowerCase()));
  const suggestions = (shopping.data?.history ?? [])
    .filter((h) => !onList.has(h.name.toLowerCase()) && (!typed || h.name.toLowerCase().includes(typed)))
    .slice(0, 8);
  const expenseCategories = (categories.data ?? []).filter((c) => c.kind === "expense");
  const categoryOptions = [
    { value: NONE, label: "No category" },
    ...expenseCategories.map((c) => ({ value: c.id, label: c.name })),
  ];

  async function addItem(itemName = name, price: number | null = null) {
    if (!itemName.trim()) return;
    await add.mutateAsync({ name: itemName.trim(), quantity: itemName === name ? quantity.trim() : "", price });
    if (itemName === name) {
      setName("");
      setQuantity("");
    }
  }

  function openCheckout() {
    setAccountId(accountId ?? accounts.data?.[0]?.id ?? null);
    if (categoryId === NONE) {
      const groceries = expenseCategories.find((c) => /grocer|food/i.test(c.name));
      if (groceries) setCategoryId(groceries.id);
    }
    setPaying(true);
  }

  async function saveCheckout() {
    if (!accountId) return;
    const paid = await checkout.mutateAsync({ accountId, categoryId: categoryId === NONE ? null : categoryId, store });
    setPaying(false);
    setStore("");
    setDone(
      paid > 0
        ? `Saved an expense of ${formatPeso(paid)}.`
        : "Cleared the ticked items. They had no prices, so no expense was added.",
    );
  }

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-surface-page">
      <KeyboardAvoidingView className="flex-1">
        <ModuleBar tone="home">
          <Text accessibilityRole="header" className="font-bold text-title text-ink">
            Shopping list
          </Text>
        </ModuleBar>

        <KeyboardScrollView contentContainerClassName="gap-5 px-5 pb-6 pt-2" keyboardShouldPersistTaps="handled">
          {done ? <Notice tone="warning">{done}</Notice> : null}
          {shopping.error || add.error ? <ErrorNotice error={(shopping.error ?? add.error)!} /> : null}

          <View className="gap-3">
            <View className="flex-row gap-3">
              <View className="min-w-0 flex-1">
                <Input
                  label="Item"
                  value={name}
                  onChangeText={setName}
                  placeholder="Eggs"
                  onSubmitEditing={() => addItem()}
                />
              </View>
              <View className="w-field-sm">
                <Input label="How many" optional value={quantity} onChangeText={setQuantity} placeholder="1 dozen" />
              </View>
            </View>
            <Button
              label="Add to list"
              variant="secondary"
              size="input"
              loading={add.isPending}
              onPress={() => addItem()}
            />
            {suggestions.length ? (
              <View className="flex-row flex-wrap gap-2">
                {suggestions.map((s) => (
                  <Chip key={s.name} label={s.name} selected={false} onPress={() => addItem(s.name, s.last_price)} />
                ))}
              </View>
            ) : null}
          </View>

          {shopping.isPending ? (
            <Skeleton />
          ) : (
            <>
              <View className="gap-2">
                <Text accessibilityRole="header" className="font-semibold text-heading text-ink">
                  To buy · {toBuy.length}
                </Text>
                <View>
                  {toBuy.length === 0 ? (
                    <Text className="py-3 font-sans text-caption text-ink-muted">Nothing left to buy.</Text>
                  ) : (
                    toBuy.map((i, n) => <ItemRow key={i.id} item={i} last={n === toBuy.length - 1} />)
                  )}
                </View>
              </View>
              {inCart.length ? (
                <View className="gap-2">
                  <Text accessibilityRole="header" className="font-semibold text-heading text-ink">
                    In the cart · {inCart.length}
                  </Text>
                  <View>
                    {inCart.map((i, n) => (
                      <ItemRow key={i.id} item={i} last={n === inCart.length - 1} />
                    ))}
                  </View>
                </View>
              ) : null}
            </>
          )}
        </KeyboardScrollView>

        <View className="gap-2 border-t-2 border-border px-5 pb-6 pt-3">
          <Text className="font-sans text-caption text-ink-muted">
            {inCart.length
              ? `${inCart.length} in the cart · ${formatPeso(total)}`
              : "Tick items as you put them in the cart."}
          </Text>
          <Button label="Check out" disabled={inCart.length === 0} onPress={openCheckout} />
        </View>
      </KeyboardAvoidingView>

      <Sheet
        visible={paying}
        onClose={() => setPaying(false)}
        title={`Check out · ${formatPeso(total)}`}
        subtitle="Adds one expense in Money."
      >
        <Select
          label="Paid from"
          options={(accounts.data ?? []).map((a) => ({ value: a.id, label: a.name }))}
          value={accountId}
          onChange={setAccountId}
        />
        <Select label="Category" options={categoryOptions} value={categoryId} onChange={setCategoryId} />
        <Input label="Store" optional value={store} onChangeText={setStore} placeholder="SM Supermarket" />
        {checkout.error ? <ErrorNotice error={checkout.error} /> : null}
        <Button label="Save expense" loading={checkout.isPending} onPress={saveCheckout} />
      </Sheet>
    </SafeAreaView>
  );
}
