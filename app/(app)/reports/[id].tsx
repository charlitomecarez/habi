import { format, isToday, parseISO } from "date-fns";
import { useLocalSearchParams } from "expo-router";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/ui/Button";
import { DataRow } from "@/components/ui/DataRow";
import { ModuleHeader } from "@/components/ui/ModuleHeader";
import { Notice } from "@/components/ui/Notice";
import { useColors } from "@/lib/colors";
import { useMarkReportRead, useReports } from "@/lib/feedback";

export default function ReportScreen() {
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const reports = useReports();
  const markRead = useMarkReportRead();
  const report = reports.data?.find((r) => r.id === id);

  if (!report) {
    return (
      <SafeAreaView edges={["top"]} className="flex-1 bg-surface-page">
        <ModuleHeader title="Report" />
        <View className="flex-1 items-center justify-center px-5">
          {reports.isPending ? (
            <ActivityIndicator color={colors.accent} />
          ) : (
            <Text className="text-center font-sans text-body text-ink-muted">This item no longer exists.</Text>
          )}
        </View>
      </SafeAreaView>
    );
  }

  const date = parseISO(report.created_at);
  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-surface-page">
      <ModuleHeader
        title={report.kind === "idea" ? "Idea" : "Bug report"}
        subtitle={isToday(date) ? `Today, ${format(date, "h:mm a")}` : format(date, "MMM d, h:mm a")}
      />
      <ScrollView contentContainerClassName="gap-4 px-5 pb-8 pt-4">
        <Text selectable className="font-sans text-body text-ink">
          {report.message}
        </Text>
        <View>
          <DataRow title="Account" detail={report.user_id.slice(0, 8)} />
          <DataRow title="App" detail={report.app_version ? `v${report.app_version}` : "Not known"} />
          <DataRow title="Phone" detail={report.device_model ?? "Not known"} last />
        </View>
        {markRead.error ? <Notice tone="danger">Could not save. Check your connection.</Notice> : null}
        {report.read_at ? null : (
          <Button label="Mark as read" loading={markRead.isPending} onPress={() => markRead.mutate(report.id)} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
