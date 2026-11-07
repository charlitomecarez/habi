import { registerWidgetTaskHandler } from "react-native-android-widget";

import { widgetTaskHandler } from "./task-handler";

// Android runs this headless task to draw a home screen widget, with no screen open.
registerWidgetTaskHandler(widgetTaskHandler);
