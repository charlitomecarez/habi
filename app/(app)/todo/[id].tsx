import { useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { TodoForm } from "@/components/todos/TodoForm";
import { Button } from "@/components/ui/Button";
import { goBack } from "@/lib/navigation";
import { useColors } from "@/lib/colors";
import { useTodo } from "@/lib/todos";

export default function EditTodoScreen() {
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: todo, isPending } = useTodo(id);

  if (todo) return <TodoForm todo={todo} />;

  return (
    <SafeAreaView className="flex-1 items-center justify-center gap-4 bg-surface-page px-5">
      {isPending ? (
        <ActivityIndicator color={colors.accent} />
      ) : (
        <View className="w-full gap-4">
          <Text className="text-center font-sans text-body text-ink-muted">This todo no longer exists.</Text>
          <Button label="Back to todos" variant="secondary" onPress={goBack} />
        </View>
      )}
    </SafeAreaView>
  );
}
