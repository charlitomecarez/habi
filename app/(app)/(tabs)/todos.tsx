import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { TodoRow } from "@/components/todos/TodoRow";
import { Button } from "@/components/ui/Button";
import { Fab } from "@/components/ui/Fab";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { Segmented } from "@/components/ui/Segmented";
import { useColors } from "@/lib/colors";
import { groupTodos, useTodos, useToggleTodo, type Todo } from "@/lib/todos";

type Filter = "today" | "upcoming" | "done";

const FILTERS = [
  { value: "today", label: "Today" },
  { value: "upcoming", label: "Upcoming" },
  { value: "done", label: "Done" },
] as const;

const EMPTY_TEXT: Record<Filter, string> = {
  today: "Nothing for today.",
  upcoming: "No todos with a later date.",
  done: "No todos finished in the last 30 days.",
};

function TodoList({ todos, onToggle }: { todos: Todo[]; onToggle: (todo: Todo) => void }) {
  return (
    <View className="overflow-hidden rounded-card border border-border bg-surface-card">
      {todos.map((todo, index) => (
        <TodoRow
          key={todo.id}
          todo={todo}
          last={index === todos.length - 1}
          onToggle={() => onToggle(todo)}
          onOpen={() => router.push({ pathname: "/todo/[id]", params: { id: todo.id } })}
        />
      ))}
    </View>
  );
}

export default function TodosScreen() {
  const colors = useColors();
  const [filter, setFilter] = useState<Filter>("today");
  const { data, isPending, error, refetch } = useTodos();
  const toggle = useToggleTodo();

  const groups = groupTodos(data ?? []);
  const openCount = (data ?? []).filter((t) => !t.completed_at).length;
  const todayCount = groups.today.filter((t) => !t.completed_at).length;
  const visible = groups[filter];
  const onToggle = (todo: Todo) => toggle.mutate({ id: todo.id, done: !todo.completed_at });

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-surface-page">
      <ScrollView contentContainerClassName="gap-5 px-5 pb-32 pt-6">
        <View className="gap-1">
          <ScreenHeader title="Todos" />
          {data ? (
            <Text className="font-sans text-label text-ink-muted">
              {openCount} open · {todayCount} due today
            </Text>
          ) : null}
        </View>

        <Segmented label="Filter" options={FILTERS} value={filter} onChange={setFilter} />

        {isPending ? (
          <ActivityIndicator color={colors.accent} className="py-8" />
        ) : error ? (
          <View className="gap-3 rounded-card bg-danger-tint p-4">
            <Text accessibilityRole="alert" className="font-sans text-caption text-danger">
              Could not load todos. {error.message}
            </Text>
            <Button label="Try again" variant="secondary" size="input" onPress={() => refetch()} />
          </View>
        ) : visible.length === 0 ? (
          <View className="items-center rounded-card border border-border bg-surface-card p-6">
            <Text className="font-sans text-body text-ink-muted">{EMPTY_TEXT[filter]}</Text>
          </View>
        ) : (
          <TodoList todos={visible} onToggle={onToggle} />
        )}

        {filter === "today" && groups.nextSevenDays.length > 0 ? (
          <View className="gap-3">
            <Text accessibilityRole="header" className="font-semibold text-heading text-ink">
              Next 7 days
            </Text>
            <TodoList todos={groups.nextSevenDays} onToggle={onToggle} />
          </View>
        ) : null}
      </ScrollView>

      <Fab label="New todo" onPress={() => router.push("/todo/new")} />
    </SafeAreaView>
  );
}
