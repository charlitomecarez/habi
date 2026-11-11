import { router } from "expo-router";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/ui/Button";
import { DataRow } from "@/components/ui/DataRow";
import { ErrorNotice } from "@/components/ui/ErrorNotice";
import { Fab } from "@/components/ui/Fab";
import { ModuleBar } from "@/components/ui/ModuleHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { documentStatus, typeLabel, useDocuments } from "@/lib/documents";

const STATUS_TONE = { danger: "over", warning: "watch", neutral: "muted", good: "good" } as const;

export default function DocumentsScreen() {
  const docs = useDocuments();
  const list = docs.data ?? [];

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-surface-page">
      <ModuleBar tone="records">
        <Text accessibilityRole="header" className="font-bold text-title text-ink">
          Documents
        </Text>
      </ModuleBar>

      <ScrollView contentContainerClassName="gap-5 px-5 pb-fab-clear pt-2">
        {docs.isPending ? (
          <Skeleton />
        ) : docs.error ? (
          <View className="gap-3">
            <ErrorNotice lead="Could not load your documents." error={docs.error} />
            <Button label="Try again" variant="secondary" size="input" onPress={() => docs.refetch()} />
          </View>
        ) : (
          <View>
            {list.length === 0 ? (
              <Text className="py-3 font-sans text-caption text-ink-muted">
                Add your LTO registration, license, passport, insurance and PhilHealth. Each one reminds you 30 days
                before it expires.
              </Text>
            ) : (
              list.map((d, i) => {
                const status = documentStatus(d);
                return (
                  <DataRow
                    key={d.id}
                    title={d.name}
                    detail={typeLabel(d.type)}
                    status={{ label: status.text, tone: STATUS_TONE[status.tone] }}
                    onPress={() => router.push({ pathname: "/documents/[id]", params: { id: d.id } })}
                    last={i === list.length - 1}
                  />
                );
              })
            )}
          </View>
        )}
      </ScrollView>

      <Fab label="Add document" onPress={() => router.push("/documents/new")} />
    </SafeAreaView>
  );
}
