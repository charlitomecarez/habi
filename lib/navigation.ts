import { router } from "expo-router";

/** Goes back, or to Home when nothing is behind this screen: after a reload, a link, or a reminder tap. */
export function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace("/");
}
