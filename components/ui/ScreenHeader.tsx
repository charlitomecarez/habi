import { Text } from "react-native";

export function ScreenHeader({ title }: { title: string }) {
  return (
    <Text accessibilityRole="header" className="font-bold text-title text-ink">
      {title}
    </Text>
  );
}
