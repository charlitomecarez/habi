import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { TodoRow } from "@/components/todos/TodoRow";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Fab } from "@/components/ui/Fab";
import { TabField } from "@/components/ui/ModuleHeader";
import { Notice } from "@/components/ui/Notice";
import { useColors } from "@/lib/colors";
import { groupTodos, isOverdue, useTodos, useToggleTodo, type Todo } from "@/lib/todos";

type Filter = "all" | "today" | "upcoming" | "done";

const FILTERS: readonly { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "today", label: "Today" },
  { value: "upcoming", label: "Later" },
  { value: "done", label: "Done" },
];

const EMPTY_TEXT: Record<Filter, string> = {
  all: "I have no todos for you yet.",
  today: "Nothing for today.",
  upcoming: "No todos with a later date.",
  done: "No todos finished in the last 30 days.",
};

function TodoList({ todos, onToggle }: { todos: Todo[]; onToggle: (todo: Todo) => void }) {
  return (
    <View>
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
  const [filter, setFilter] = useState<Filter>("all");
  const { data, isPending, error, refetch } = useTodos();
  const toggle = useToggleTodo();

  const groups = groupTodos(data ?? []);
  const overdueCount = (data ?? []).filter((t) => isOverdue(t)).length;
  const todayCount = groups.today.filter((t) => !t.completed_at).length;
  const overdue = groups.today.filter((t) => isOverdue(t));
  const dueToday = groups.today.filter((t) => !isOverdue(t) && (filter === "today" || !t.completed_at));
  const sections = [
    { title: "Overdue", todos: filter === "all" || filter === "today" ? overdue : [] },
    { title: "Today", todos: filter === "all" || filter === "today" ? dueToday : [] },
    { title: "Later", todos: filter === "all" || filter === "upcoming" ? groups.upcoming : [] },
    { title: "", todos: filter === "done" ? groups.done : [] },
  ].filter((section) => section.todos.length > 0);
  const onToggle = (todo: Todo) => toggle.mutate({ id: todo.id, done: !todo.completed_at });

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-surface-page">
      <TabField
        lead={data ? `${todayCount} left today` : "Todos"}
        detail={overdueCount > 0 ? `${overdueCount} overdue` : undefined}
      />
      <ScrollView contentContainerClassName="gap-5 px-5 pb-fab-clear pt-4">
        <View accessibilityRole="radiogroup" accessibilityLabel="Filter" className="flex-row flex-wrap gap-2">
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

        {isPending ? (
          <ActivityIndicator color={colors.accent} className="py-8" />
        ) : error ? (
          <View className="gap-3">
            <Notice tone="danger">Could not load todos. Check your connection.</Notice>
            <Button label="Try again" variant="secondary" size="input" onPress={() => refetch()} />
          </View>
        ) : sections.length === 0 ? (
          <Text className="py-4 font-sans text-body text-ink-muted">{EMPTY_TEXT[filter]}</Text>
        ) : (
          sections.map((section) => (
            <View key={section.title}>
              {section.title ? (
                <Text accessibilityRole="header" className="font-semibold text-heading text-ink">
                  {section.title}
                </Text>
              ) : null}
              <TodoList todos={section.todos} onToggle={onToggle} />
            </View>
          ))
        )}
      </ScrollView>

      <Fab label="Add todo" onPress={() => router.push("/todo/new")} />
    </SafeAreaView>
  );
}
