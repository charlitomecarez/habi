import { useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { TodoForm } from "@/components/todos/TodoForm";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { goBack } from "@/lib/navigation";
import { useTodo } from "@/lib/todos";

export default function EditTodoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: todo, isPending } = useTodo(id);

  if (todo) return <TodoForm todo={todo} />;

  return (
    <SafeAreaView className="flex-1 items-center justify-center gap-4 bg-surface-page px-5">
      {isPending ? (
        <View className="w-full flex-1 self-stretch pt-4">
          <Skeleton layout="detail" />
        </View>
      ) : (
        <View className="w-full gap-4">
          <Text className="text-center font-sans text-body text-ink-muted">This todo no longer exists.</Text>
          <Button label="Back to todos" variant="secondary" onPress={goBack} />
        </View>
      )}
    </SafeAreaView>
  );
}
