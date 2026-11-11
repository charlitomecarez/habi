import { format, isToday, parseISO } from "date-fns";
import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { DataRow } from "@/components/ui/DataRow";
import { EmptyState } from "@/components/ui/EmptyState";
import { ModuleHeader, useHeaderScroll } from "@/components/ui/ModuleHeader";
import { Notice } from "@/components/ui/Notice";
import { Skeleton } from "@/components/ui/Skeleton";
import { useReports, type Report } from "@/lib/feedback";

type Filter = "new" | "read" | "all";

const FILTERS = [
  { value: "new", label: "New" },
  { value: "read", label: "Read" },
  { value: "all", label: "All" },
] as const;

function detail(r: Report): string {
  const date = parseISO(r.created_at);
  const when = isToday(date) ? `Today, ${format(date, "h:mm a")}` : format(date, "MMM d");
  return [r.kind === "idea" ? "Idea" : "Bug", when, r.app_version ? `v${r.app_version}` : null]
    .filter(Boolean)
    .join(" · ");
}

export default function ReportsScreen() {
  const { scrollY, onScroll } = useHeaderScroll();
  const reports = useReports();
  const [filter, setFilter] = useState<Filter>("new");
  const all = reports.data ?? [];
  const fresh = all.filter((r) => !r.read_at).length;
  const list = all.filter((r) => filter === "all" || (filter === "new") === !r.read_at);

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-surface-page">
      <ModuleHeader scrollY={scrollY} title="Reports" subtitle={`${fresh} new`} />
      <ScrollView onScroll={onScroll} scrollEventThrottle={16} contentContainerClassName="gap-4 px-5 pb-8 pt-4">
        {reports.isPending ? (
          <Skeleton />
        ) : reports.error ? (
          <View className="gap-3">
            <Notice tone="danger">Could not load reports. Check your connection.</Notice>
            <Button label="Try again" variant="secondary" size="input" onPress={() => reports.refetch()} />
          </View>
        ) : all.length === 0 ? (
          <EmptyState drawing="list" title="No reports yet" body="A report from any account shows here." />
        ) : (
          <>
            <View accessibilityRole="radiogroup" accessibilityLabel="Show" className="flex-row flex-wrap gap-2">
              {FILTERS.map((f) => (
                <Chip
                  key={f.value}
                  label={f.label}
                  variant="filter"
                  selected={filter === f.value}
                  onPress={() => setFilter(f.value)}
                />
              ))}
            </View>
            <View>
              {list.map((report, index) => (
                <DataRow
                  key={report.id}
                  title={report.message}
                  detail={detail(report)}
                  status={report.read_at ? { label: "Read", tone: "muted" } : { label: "New", tone: "over" }}
                  onPress={() => router.push({ pathname: "/reports/[id]", params: { id: report.id } })}
                  last={index === list.length - 1}
                />
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
