import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { TodoRow } from "@/components/todos/TodoRow";
import { Button } from "@/components/ui/Button";
import { ConfirmSheet } from "@/components/ui/ConfirmSheet";
import { EmptyState } from "@/components/ui/EmptyState";
import { Fab } from "@/components/ui/Fab";
import { TabField, useHeaderScroll } from "@/components/ui/ModuleHeader";
import { Notice } from "@/components/ui/Notice";
import { Segmented } from "@/components/ui/Segmented";
import { Skeleton } from "@/components/ui/Skeleton";
import { errorText } from "@/lib/errors";
import { showSnackbar } from "@/lib/snackbar";
import { groupTodos, isOverdue, useDeleteTodo, useTodos, useToggleTodo, type Todo } from "@/lib/todos";

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

function TodoList({
  todos,
  onToggle,
  onDelete,
}: {
  todos: Todo[];
  onToggle: (todo: Todo) => void;
  onDelete: (todo: Todo) => void;
}) {
  return (
    <View>
      {todos.map((todo, index) => (
        <TodoRow
          key={todo.id}
          todo={todo}
          last={index === todos.length - 1}
          onToggle={() => onToggle(todo)}
          onDelete={() => onDelete(todo)}
          onOpen={() => router.push({ pathname: "/todo/[id]", params: { id: todo.id } })}
        />
      ))}
    </View>
  );
}

export default function TodosScreen() {
  const [filter, setFilter] = useState<Filter>("all");
  const { data, isPending, error, refetch } = useTodos();
  const toggle = useToggleTodo();
  const remove = useDeleteTodo();
  const [deleting, setDeleting] = useState<Todo | null>(null);
  const { scrollY, onScroll } = useHeaderScroll();

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
  const openCount = (data ?? []).filter((t) => !t.completed_at).length;
  const counts: Record<Filter, number> = {
    all: openCount,
    today: todayCount,
    upcoming: groups.upcoming.length,
    done: groups.done.length,
  };
  const onToggle = (todo: Todo) => {
    const done = !todo.completed_at;
    toggle.mutate(
      { id: todo.id, done },
      { onError: (e) => showSnackbar({ text: `Could not save. ${errorText(e)}`, tone: "error" }) },
    );
    if (done) {
      showSnackbar({
        text: "Todo done.",
        actionLabel: "Undo",
        onAction: () => toggle.mutate({ id: todo.id, done: false }),
      });
    }
  };

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-surface-page">
      <TabField
        lead={data ? `${todayCount} left today` : "Todos"}
        detail={overdueCount > 0 ? `${overdueCount} overdue` : undefined}
        scrollY={scrollY}
      />
      <ScrollView onScroll={onScroll} scrollEventThrottle={16} contentContainerClassName="gap-5 px-5 pb-fab-clear pt-4">
        <Segmented
          label="Filter"
          options={FILTERS.map((f) => ({ ...f, count: data ? counts[f.value] : undefined }))}
          value={filter}
          onChange={setFilter}
        />

        {isPending ? (
          <Skeleton />
        ) : error ? (
          <View className="gap-3">
            <Notice tone="danger">Could not load todos. Check your connection.</Notice>
            <Button label="Try again" variant="secondary" size="input" onPress={() => refetch()} />
          </View>
        ) : sections.length === 0 ? (
          filter === "all" ? (
            <EmptyState
              drawing="list"
              title={EMPTY_TEXT.all}
              body="Add one with the button, and I remind you when it is due."
            />
          ) : (
            <Text className="py-4 font-sans text-body text-ink-muted">{EMPTY_TEXT[filter]}</Text>
          )
        ) : (
          sections.map((section) => (
            <View key={section.title}>
              {section.title ? (
                <Text accessibilityRole="header" className="font-semibold text-heading text-ink">
                  {section.title}
                </Text>
              ) : null}
              <TodoList todos={section.todos} onToggle={onToggle} onDelete={setDeleting} />
            </View>
          ))
        )}
      </ScrollView>

      <Fab label="Add todo" onPress={() => router.push("/todo/new")} />
      <ConfirmSheet
        visible={deleting !== null}
        title="Delete this todo?"
        body={deleting ? `“${deleting.title}” is deleted. You cannot undo this.` : undefined}
        confirmLabel="Delete todo"
        loading={remove.isPending}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          const todo = deleting;
          setDeleting(null);
          if (!todo) return;
          try {
            await remove.mutateAsync(todo.id);
          } catch (e) {
            showSnackbar({ text: `Could not delete. ${errorText(e)}`, tone: "error" });
          }
        }}
      />
    </SafeAreaView>
  );
}
