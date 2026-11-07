import "expo-router/entry";

import { registerWidgetTaskHandler } from "react-native-android-widget";

import { widgetTaskHandler } from "./widgets/task-handler";

// Android runs this headless task to draw a home screen widget, with no screen open.
registerWidgetTaskHandler(widgetTaskHandler);
