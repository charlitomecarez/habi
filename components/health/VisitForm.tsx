import { Ionicons } from "@expo/vector-icons";
import { parseISO } from "date-fns";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/ui/Button";
import { DateTimeField } from "@/components/ui/DateTimeField";
import { Input } from "@/components/ui/Input";
import { KeyboardAvoidingView } from "@/components/ui/KeyboardAvoidingView";
import { Notice } from "@/components/ui/Notice";
import { useColors } from "@/lib/colors";
import { useSaveVisit, type Visit } from "@/lib/health";

/** Full-screen form for a doctor visit. Lab photos are added on the visit screen. */
export function VisitForm({ visit }: { visit?: Visit }) {
  const colors = useColors();
  const save = useSaveVisit();
  const [visitedOn, setVisitedOn] = useState<Date | null>(visit ? parseISO(visit.visited_on) : new Date());
  const [doctor, setDoctor] = useState(visit?.doctor ?? "");
  const [reason, setReason] = useState(visit?.reason ?? "");
  const [notes, setNotes] = useState(visit?.notes ?? "");
  const [error, setError] = useState<string | null>(null);

  async function onSave() {
    if (!visitedOn) return setError("Choose the date.");
    if (!doctor.trim() && !reason.trim()) return setError("Enter the doctor or the reason.");
    const id = await save.mutateAsync({
      id: visit?.id,
      input: { visitedOn, doctor: doctor.trim(), reason: reason.trim(), notes: notes.trim() || null },
    });
    if (visit) router.back();
    else router.replace({ pathname: "/health/visit/[id]", params: { id } });
  }

  return (
    <SafeAreaView className="flex-1 bg-surface-page">
      <KeyboardAvoidingView className="flex-1">
        <View className="flex-row items-center gap-1 px-3 pb-2 pt-2">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={() => router.back()}
            className="h-touch w-touch items-center justify-center"
          >
            <Ionicons name="close" size={22} color={colors.ink} />
          </Pressable>
          <Text accessibilityRole="header" className="font-bold text-title text-ink">
            {visit ? "Edit visit" : "Add visit"}
          </Text>
        </View>
        <ScrollView contentContainerClassName="gap-5 px-5 pb-6 pt-2" keyboardShouldPersistTaps="handled">
          <DateTimeField label="Date" mode="date" value={visitedOn} onChange={setVisitedOn} />
          <Input label="Doctor or clinic" value={doctor} onChangeText={setDoctor} placeholder="Dr. Santos" />
          <Input label="Reason" value={reason} onChangeText={setReason} placeholder="Annual check-up" />
          <Input label="Notes" optional value={notes} onChangeText={setNotes} multiline placeholder="What the doctor said, results" />
        </ScrollView>
        <View className="gap-3 border-t border-border px-5 pb-6 pt-3">
          {error || save.error ? <Notice tone="danger">{error ?? save.error?.message}</Notice> : null}
          <Button label="Save visit" loading={save.isPending} onPress={onSave} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
