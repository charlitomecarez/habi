import { useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DocumentForm } from "@/components/documents/DocumentForm";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { Skeleton } from "@/components/ui/Skeleton";
import { goBack } from "@/lib/navigation";
import { useDocument } from "@/lib/documents";

export default function EditDocumentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const doc = useDocument(id);
  if (doc.data) return <DocumentForm doc={doc.data} />;
  return (
    <SafeAreaView className="flex-1 items-center justify-center bg-surface-page px-5">
      {doc.isPending ? (
        <View className="w-full flex-1 self-stretch pt-4">
          <Skeleton layout="detail" />
        </View>
      ) : (
        <View className="w-full gap-3">
          <Notice tone="danger">{doc.error ? doc.error.message : "This document was deleted."}</Notice>
          <Button label="Back" variant="secondary" size="input" onPress={goBack} />
        </View>
      )}
    </SafeAreaView>
  );
}
