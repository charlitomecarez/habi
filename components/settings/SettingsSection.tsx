import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState, type ComponentProps, type ReactNode } from "react";
import { Pressable, Switch, Text, View } from "react-native";

import { ExchangeRateSheet } from "@/components/money/ExchangeRateSheet";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { OptionSheet } from "@/components/ui/OptionSheet";
import { ProfilePhoto } from "@/components/ui/ProfilePhoto";
import { useColors } from "@/lib/colors";
import { useAccounts, useExchangeRates } from "@/lib/money";
import { hourLabel, timeZoneOptions, useSaveUserSettings, useUserSettings } from "@/lib/settings";
import { THEME_OPTIONS, themeLabel, useThemeStore } from "@/lib/theme";
import { useAuth } from "@/providers/auth-provider";

const FOREIGN = "USD";

type RowProps = {
  title: string;
  detail: string;
  icon?: ComponentProps<typeof Ionicons>["name"];
  onPress?: () => void;
  /** Replaces the chevron, e.g. a switch. */
  trailing?: ReactNode;
  last?: boolean;
};

function Row({ title, detail, icon, onPress, trailing, last = false }: RowProps) {
  const colors = useColors();
  const content = (
    <>
      {icon ? <Ionicons name={icon} size={22} color={colors.accent} /> : null}
      <View className="min-w-0 flex-1 gap-1">
        <Text className={`text-row-title text-ink ${icon ? "font-semibold" : "font-medium"}`}>{title}</Text>
        <Text numberOfLines={1} className="font-sans text-caption text-ink-muted">
          {detail}
        </Text>
      </View>
      {trailing ?? <Ionicons name="chevron-forward" size={18} color={colors.inkMuted} />}
    </>
  );
  const className = `min-h-touch flex-row items-center gap-3 px-4 py-3 ${last ? "" : "border-b-2 border-border"}`;
  return onPress ? (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${detail}`}
      onPress={onPress}
      className={`${className} active:bg-surface-muted`}
    >
      {content}
    </Pressable>
  ) : (
    <View className={className}>{content}</View>
  );
}

/** Your account and every setting, laid out at the end of More. */
export function SettingsSection() {
  const colors = useColors();
  const { session, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const [sheet, setSheet] = useState<"rate" | "timezone" | "theme" | null>(null);
  const theme = useThemeStore((s) => s.preference);
  const setTheme = useThemeStore((s) => s.setPreference);

  const accounts = useAccounts();
  const rates = useExchangeRates();
  const settings = useUserSettings();
  const saveSettings = useSaveUserSettings();

  const user = session?.user;
  const name = (user?.user_metadata.full_name as string | undefined) ?? user?.email ?? "Signed in";
  const provider = user?.app_metadata.provider === "google" ? "Signed in with Google" : "Signed in with email";
  const usd = rates.data?.find((r) => r.currency === FOREIGN) ?? null;
  const prefs = settings.data;

  async function onSignOut() {
    setSigningOut(true);
    try {
      await signOut();
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <View className="gap-5">
      <Text accessibilityRole="header" className="font-semibold text-heading text-ink">
        Settings
      </Text>

      <View className="flex-row items-center gap-4 border-b-2 border-border py-3">
        <View className="h-touch w-touch items-center justify-center overflow-hidden rounded-pill bg-border">
          <ProfilePhoto
            letter={name.charAt(0).toUpperCase()}
            letterClassName="font-semibold text-title text-ink"
            size={48}
          />
        </View>
        <View className="flex-1 gap-1">
          <Text className="font-semibold text-heading text-ink" numberOfLines={1}>
            {name}
          </Text>
          <Text className="font-sans text-caption text-ink-muted">{provider}</Text>
        </View>
      </View>

      <View className="gap-3">
        <View>
          <Row icon="contrast-outline" title="Theme" detail={themeLabel(theme)} onPress={() => setSheet("theme")} />
          <Row
            title="Daily email digest"
            detail={prefs ? (prefs.digestEnabled ? hourLabel(prefs.digestHour) : "Off") : "Loading…"}
            trailing={
              <Switch
                accessibilityLabel="Daily email digest"
                value={prefs?.digestEnabled ?? false}
                disabled={!prefs}
                onValueChange={(on) => saveSettings.mutate({ digestEnabled: on })}
                trackColor={{ true: colors.accent }}
              />
            }
          />
          <Row
            title="Money accounts"
            detail={accounts.data ? accounts.data.map((a) => a.name).join(", ") : "Loading…"}
            onPress={() => router.push("/money/accounts")}
          />
          <Row
            title="Exchange rates"
            detail={usd ? `${FOREIGN} ₱${usd.rateToPhp}` : `No ${FOREIGN} rate set`}
            onPress={() => setSheet("rate")}
          />
          <Row
            title="Time zone"
            detail={prefs?.timezone ?? "Loading…"}
            onPress={prefs ? () => setSheet("timezone") : undefined}
            last
          />
        </View>
        {saveSettings.error ? <Notice tone="danger">{saveSettings.error.message}</Notice> : null}
      </View>

      <Button label="Sign out" variant="destructive" size="input" loading={signingOut} onPress={onSignOut} />
      <ExchangeRateSheet
        visible={sheet === "rate"}
        onClose={() => setSheet(null)}
        currency={FOREIGN}
        rate={usd?.rateToPhp ?? null}
      />
      <OptionSheet
        visible={sheet === "theme"}
        onClose={() => setSheet(null)}
        title="Theme"
        subtitle="Light or dark on this device. Same as the phone follows your phone's setting."
        options={THEME_OPTIONS}
        value={theme}
        onChange={(value) => {
          setTheme(value);
          setSheet(null);
        }}
      />
      {prefs ? (
        <OptionSheet
          visible={sheet === "timezone"}
          onClose={() => setSheet(null)}
          title="Time zone"
          subtitle="Reminders and the daily digest use this time zone."
          options={timeZoneOptions(prefs.timezone)}
          value={prefs.timezone}
          onChange={(timezone) => saveSettings.mutate({ timezone })}
        />
      ) : null}
    </View>
  );
}
