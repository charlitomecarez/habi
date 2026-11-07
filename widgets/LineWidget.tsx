import { FlexWidget, TextWidget } from "react-native-android-widget";

import type { WidgetLine } from "./content";

// Android draws these views, so the design tokens do not apply here. The values match global.css.
const SHELL = "#23205C";
const ON_SHELL = "#F7EFD9";
const CARD = "#F4ECD6";
const INK = "#1E1B3A";
const INK_MUTED = "#5A5578";

/** A title band, one number and one line. A tap opens `uri`. */
export function LineWidget({ title, line, uri }: { title: string; line: WidgetLine; uri: string }) {
  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri }}
      style={{ height: "match_parent", width: "match_parent", backgroundColor: CARD, borderRadius: 18 }}
    >
      <FlexWidget
        style={{
          width: "match_parent",
          backgroundColor: SHELL,
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderTopLeftRadius: 18,
          borderTopRightRadius: 18,
        }}
      >
        <TextWidget text={title} style={{ color: ON_SHELL, fontSize: 12, fontWeight: "700" }} />
      </FlexWidget>
      <FlexWidget style={{ paddingHorizontal: 12, paddingVertical: 8 }}>
        <TextWidget text={line.lead} style={{ color: INK, fontSize: 24, fontWeight: "900" }} />
        <TextWidget text={line.note} style={{ color: INK_MUTED, fontSize: 12 }} />
      </FlexWidget>
    </FlexWidget>
  );
}
