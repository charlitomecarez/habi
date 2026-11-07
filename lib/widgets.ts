import { requestWidgetUpdate } from "react-native-android-widget";

import { SCREEN_TIME_WIDGET, SLEEP_WIDGET, widgetFor } from "@/widgets/render";

/** Redraws both widgets. A phone with no widget added does nothing. */
export async function refreshWidgets(): Promise<void> {
  await Promise.all(
    [SLEEP_WIDGET, SCREEN_TIME_WIDGET].map((widgetName) =>
      requestWidgetUpdate({
        widgetName,
        renderWidget: () => widgetFor(widgetName),
        widgetNotFound: () => undefined,
      }).catch(() => undefined),
    ),
  );
}
