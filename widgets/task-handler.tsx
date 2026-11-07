import type { WidgetTaskHandlerProps } from "react-native-android-widget";

import { widgetFor } from "./render";

export async function widgetTaskHandler({ widgetAction, widgetInfo, renderWidget }: WidgetTaskHandlerProps) {
  if (widgetAction === "WIDGET_ADDED" || widgetAction === "WIDGET_UPDATE" || widgetAction === "WIDGET_RESIZED") {
    renderWidget(await widgetFor(widgetInfo.widgetName));
  }
}
