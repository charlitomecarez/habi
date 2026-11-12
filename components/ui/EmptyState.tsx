import { Text, View } from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";

import { Button } from "@/components/ui/Button";
import { FadeIn } from "@/components/ui/Motion";
import { useColors } from "@/lib/colors";

export type EmptyDrawing = "list" | "box" | "calendar" | "bowl";

const STROKE = { strokeWidth: 3, strokeLinecap: "round", strokeLinejoin: "round", fill: "none" } as const;

function Drawing({ kind }: { kind: EmptyDrawing }) {
  const colors = useColors();
  const main = { ...STROKE, stroke: colors.accent };
  const soft = { ...STROKE, stroke: colors.inkMuted };
  return (
    // The hiding props go on a View. On the web, react-native-svg hands them to the <svg> tag, and React warns.
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={96} height={96} viewBox="0 0 96 96">
        <Circle cx={48} cy={48} r={44} fill={colors.border} opacity={0.5} />
        {kind === "list" && (
          <>
            <Rect x={26} y={22} width={44} height={52} rx={6} {...main} />
            <Path d="M36 38l3 3 6-7M36 56l3 3 6-7" {...main} />
            <Path d="M52 38h10M52 56h10" {...soft} />
          </>
        )}
        {kind === "box" && (
          <>
            <Path d="M22 36l26-14 26 14v26L48 76 22 62z" {...main} />
            <Path d="M22 36l26 14 26-14M48 50v26" {...soft} />
          </>
        )}
        {kind === "calendar" && (
          <>
            <Rect x={22} y={26} width={52} height={48} rx={6} {...main} />
            <Path d="M22 40h52M36 20v12M60 20v12" {...main} />
            <Path d="M34 52h6M46 52h6M58 52h4M34 62h6M46 62h6" {...soft} />
          </>
        )}
        {kind === "bowl" && (
          <>
            <Path d="M20 46h56a28 28 0 01-56 0z" {...main} />
            <Path d="M38 34c-4-5 4-7 0-12M50 34c-4-5 4-7 0-12M62 34c-4-5 4-7 0-12" {...soft} />
          </>
        )}
      </Svg>
    </View>
  );
}

type EmptyStateProps = {
  drawing: EmptyDrawing;
  title: string;
  body?: string;
  /** The one action that fills the screen. */
  action?: { label: string; onPress: () => void };
};

/** What a screen shows before it has data: a simple drawing, a sentence and one action. */
export function EmptyState({ drawing, title, body, action }: EmptyStateProps) {
  return (
    <FadeIn>
      <View className="items-center gap-3 px-6 py-8">
        <Drawing kind={drawing} />
        <Text className="text-center font-semibold text-heading text-ink">{title}</Text>
        {body ? <Text className="text-center font-sans text-label text-ink-muted">{body}</Text> : null}
        {action ? <Button label={action.label} variant="secondary" onPress={action.onPress} /> : null}
      </View>
    </FadeIn>
  );
}
