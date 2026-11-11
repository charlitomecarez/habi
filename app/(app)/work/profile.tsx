import { useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/ui/Button";
import { ErrorNotice } from "@/components/ui/ErrorNotice";
import { Input } from "@/components/ui/Input";
import { KeyboardAvoidingView } from "@/components/ui/KeyboardAvoidingView";
import { KeyboardScrollView } from "@/components/ui/KeyboardScrollView";
import { ModuleHeader, useHeaderScroll } from "@/components/ui/ModuleHeader";
import { Notice } from "@/components/ui/Notice";
import { goBack } from "@/lib/navigation";
import { splitList, useJobs, useReadResume, useSaveProfile } from "@/lib/jobs";
import { pickStatement } from "@/lib/statement-file";

export default function WorkProfileScreen() {
  const { scrollY, onScroll } = useHeaderScroll();
  const { upload } = useLocalSearchParams<{ upload?: string }>();
  const profile = useJobs().data?.profile;
  const read = useReadResume();
  const save = useSaveProfile();

  const [skills, setSkills] = useState(profile?.skills.join(", ") ?? "");
  const [roles, setRoles] = useState(profile?.past_roles ?? "");
  const [wanted, setWanted] = useState(profile?.wanted_jobs.join(", ") ?? "");
  const [countries, setCountries] = useState(profile?.countries.join(", ") ?? "Philippines");
  const [salary, setSalary] = useState(profile?.salary_floor ? String(profile.salary_floor) : "");
  const [fromResume, setFromResume] = useState(false);

  async function pickResume() {
    const form = await pickStatement();
    if (!form) return;
    read.mutate(form, {
      onSuccess: (draft) => {
        setSkills(draft.skills.join(", "));
        setRoles(draft.past_roles);
        setWanted(draft.wanted_jobs.join(", "));
        setFromResume(true);
      },
    });
  }

  const asked = useRef(false);
  useEffect(() => {
    if (upload && !asked.current) {
      asked.current = true;
      void pickResume();
    }
    // Opens the picker once, when the screen opens for an upload.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [upload]);

  async function onSave() {
    await save.mutateAsync({
      skills: splitList(skills),
      past_roles: roles.trim(),
      wanted_jobs: splitList(wanted),
      countries: splitList(countries),
      remote_ok: true,
      salary_floor: Number(salary.replace(/[^\d.]/g, "")) || null,
    });
    goBack();
  }

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-surface-page">
      <KeyboardAvoidingView className="flex-1">
        <ModuleHeader
          scrollY={scrollY}
          title={fromResume ? "Check your profile" : "Work profile"}
          subtitle={fromResume ? "Draft from your resume" : undefined}
          tone="records"
        />
        <KeyboardScrollView
          onScroll={onScroll}
          scrollEventThrottle={16}
          contentContainerClassName="gap-5 px-5 pb-6 pt-4"
          keyboardShouldPersistTaps="handled"
        >
          {read.isPending ? (
            <Notice tone="neutral">
              Reading your resume… I remove emails, phone numbers and links. Groq then drafts your profile. I do not
              keep the file.
            </Notice>
          ) : null}
          {read.error ? (
            <View className="gap-3">
              <ErrorNotice error={read.error} />
              <Button label="Choose another file" variant="secondary" onPress={() => void pickResume()} />
            </View>
          ) : null}
          {fromResume ? (
            <Text className="font-sans text-caption text-ink-muted">
              Check each line. Remove any name or address. Groq reads this text.
            </Text>
          ) : null}

          <Input label="Skills" value={skills} onChangeText={setSkills} placeholder="React Native, TypeScript" />
          <Input label="Past roles" value={roles} onChangeText={setRoles} multiline maxLength={4000} />
          <Input
            label="Wanted jobs"
            value={wanted}
            onChangeText={setWanted}
            placeholder="Project manager, Software developer"
          />
          <Input label="Countries" value={countries} onChangeText={setCountries} placeholder="Philippines" />
          <Input
            label="Salary floor"
            optional
            value={salary}
            onChangeText={setSalary}
            inputMode="numeric"
            keyboardType="number-pad"
            placeholder="80000"
          />
          {save.error ? <Notice tone="danger">Could not save. Check your connection.</Notice> : null}
          <Button
            label="Save work profile"
            loading={save.isPending}
            disabled={splitList(wanted).length === 0}
            onPress={() => void onSave()}
          />
          {!fromResume && !read.isPending ? (
            <Button label="Upload resume (PDF)" variant="secondary" onPress={() => void pickResume()} />
          ) : null}
        </KeyboardScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
