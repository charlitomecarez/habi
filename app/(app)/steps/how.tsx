import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DataRow } from "@/components/ui/DataRow";
import { ModuleHeader } from "@/components/ui/ModuleHeader";

/** Health Connect requires a page that says what the app reads. */
export default function HowItWorksScreen() {
  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-surface-page">
      <ModuleHeader title="How it works" tone="daily" />
      <ScrollView contentContainerClassName="px-5 pb-8 pt-4">
        <View>
          <DataRow
            title="What my-app reads"
            detail="Steps, from Health Connect. Sleep, from when your screen is off. You can fix the times."
          />
          <DataRow title="Where it goes" detail="Nowhere. my-app sends none of it to Supabase or any other service." />
          <DataRow title="How to stop" detail="Turn off access in Health Connect at any time." last />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
