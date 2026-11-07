import { ScrollView, Text, useWindowDimensions, View } from "react-native";

import { PressScale } from "@/components/ui/Motion";
import { formatMoney, type Account } from "@/lib/money";

/** A card fills most of the screen, so the next one shows at the edge. */
const CARD_SHARE = 0.8;
const CARD_GAP = 12;
const STRANDS = 32;

const KIND_LABEL: Record<string, string> = { cash: "Cash", bank: "Bank", ewallet: "E-wallet" };

/** A diagonal twill, like a woven banig. Each card starts at a different place. */
function WovenEdge({ seed }: { seed: number }) {
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {[0, 1, 2, 3].map((row) => (
        <View key={row} className="h-1 flex-row">
          {Array.from({ length: STRANDS }, (_, i) => (
            <View key={i} className={`flex-1 ${(i + row + seed) % 4 < 2 ? "bg-on-shell/40" : "bg-on-shell/10"}`} />
          ))}
        </View>
      ))}
    </View>
  );
}

type AccountCardsProps = {
  accounts: readonly Account[];
  onPress: (account: Account) => void;
};

/** Each account as a card in a swipeable row. A tap edits the balance. */
export function AccountCards({ accounts, onPress }: AccountCardsProps) {
  const { width } = useWindowDimensions();
  const cardWidth = Math.round(width * CARD_SHARE);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      decelerationRate="fast"
      snapToInterval={cardWidth + CARD_GAP}
      snapToAlignment="start"
      className="-mx-5"
      contentContainerClassName="gap-3 px-5"
    >
      {accounts.map((account, index) => (
        <PressScale
          key={account.id}
          accessibilityRole="button"
          accessibilityLabel={`${account.name}, ${formatMoney(account.balance, account.currency)}. Edit`}
          onPress={() => onPress(account)}
          wrapperStyle={{ width: cardWidth }}
          className="h-bank-card justify-between overflow-hidden rounded-hero bg-shell"
        >
          <View className="gap-1 px-5 pt-4">
            <Text numberOfLines={1} className="font-semibold text-row-title text-on-shell">
              {account.name}
            </Text>
            <Text className="font-sans text-caption text-on-shell">{KIND_LABEL[account.kind] ?? "Account"}</Text>
          </View>
          <Text
            adjustsFontSizeToFit
            minimumFontScale={0.7}
            numberOfLines={1}
            className="px-5 font-bold text-display text-on-shell"
          >
            {formatMoney(account.balance, account.currency)}
          </Text>
          <WovenEdge seed={index} />
        </PressScale>
      ))}
    </ScrollView>
  );
}
