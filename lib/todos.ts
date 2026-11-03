import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addDays, isBefore, isSameDay, startOfDay, subDays } from "date-fns";

import { supabase } from "@/lib/supabase";

export type TodoRepeat = "none" | "daily" | "weekly" | "monthly";
export type TodoPriority = 1 | 2 | 3;

export type Todo = {
  id: string;
  title: string;
  notes: string | null;
  priority: TodoPriority;
  due_at: string | null;
  remind_at: string | null;
  repeat: TodoRepeat;
  completed_at: string | null;
  created_at: string;
};

export type TodoInput = Pick<Todo, "title" | "notes" | "priority" | "due_at" | "remind_at" | "repeat">;

const TODOS_KEY = ["todos"] as const;
const COLUMNS = "id, title, notes, priority, due_at, remind_at, repeat, completed_at, created_at";
const DONE_HISTORY_DAYS = 30;

/** Open todos plus the ones finished in the last 30 days. */
export function useTodos() {
  return useQuery({
    queryKey: TODOS_KEY,
    queryFn: async (): Promise<Todo[]> => {
      const since = subDays(new Date(), DONE_HISTORY_DAYS).toISOString();
      const { data, error } = await supabase
        .from("todos")
        .select(COLUMNS)
        .or(`completed_at.is.null,completed_at.gte.${since}`)
        .order("due_at", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as Todo[];
    },
  });
}

export function useTodo(id: string) {
  const { data, ...rest } = useTodos();
  return { data: data?.find((t) => t.id === id), ...rest };
}

export function useSaveTodo() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id?: string; input: TodoInput }) => {
      const { error } = id
        ? await supabase.from("todos").update(input).eq("id", id)
        : await supabase.from("todos").insert(input);
      if (error) throw error;
    },
    onSettled: () => client.invalidateQueries({ queryKey: TODOS_KEY }),
  });
}

export function useDeleteTodo() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("todos").delete().eq("id", id);
      if (error) throw error;
    },
    onSettled: () => client.invalidateQueries({ queryKey: TODOS_KEY }),
  });
}

/** Checks or unchecks a todo. The list updates before the server answers. */
export function useToggleTodo() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, done }: { id: string; done: boolean }) => {
      const { error } = await supabase
        .from("todos")
        .update({ completed_at: done ? new Date().toISOString() : null })
        .eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, done }) => {
      await client.cancelQueries({ queryKey: TODOS_KEY });
      const previous = client.getQueryData<Todo[]>(TODOS_KEY);
      client.setQueryData<Todo[]>(TODOS_KEY, (todos) =>
        todos?.map((t) =>
          t.id === id ? { ...t, completed_at: done ? new Date().toISOString() : null } : t,
        ),
      );
      return { previous };
    },
    onError: (_error, _vars, context) => client.setQueryData(TODOS_KEY, context?.previous),
    // A repeating todo adds its next occurrence on the server.
    onSettled: () => client.invalidateQueries({ queryKey: TODOS_KEY }),
  });
}

/** The day a todo belongs to: its due date, else its reminder. */
export function todoDate(todo: Todo): Date | null {
  const value = todo.due_at ?? todo.remind_at;
  return value ? new Date(value) : null;
}

export function isOverdue(todo: Todo, now = new Date()): boolean {
  const date = todoDate(todo);
  return todo.completed_at === null && date !== null && isBefore(date, startOfDay(now));
}

export type TodoGroups = {
  /** Open with no date, overdue or dated today, plus finished today. */
  today: Todo[];
  /** Open and dated after today. */
  upcoming: Todo[];
  /** The part of upcoming that falls in the next 7 days. */
  nextSevenDays: Todo[];
  done: Todo[];
};

export function groupTodos(todos: Todo[], now = new Date()): TodoGroups {
  const tomorrow = addDays(startOfDay(now), 1);
  const weekEnd = addDays(tomorrow, 7);
  const groups: TodoGroups = { today: [], upcoming: [], nextSevenDays: [], done: [] };

  for (const todo of todos) {
    if (todo.completed_at) {
      groups.done.push(todo);
      if (isSameDay(new Date(todo.completed_at), now)) groups.today.push(todo);
      continue;
    }
    const date = todoDate(todo);
    if (date === null || isBefore(date, tomorrow)) {
      groups.today.push(todo);
    } else {
      groups.upcoming.push(todo);
      if (isBefore(date, weekEnd)) groups.nextSevenDays.push(todo);
    }
  }

  groups.today.sort((a, b) => Number(a.completed_at !== null) - Number(b.completed_at !== null));
  groups.done.sort((a, b) => b.completed_at!.localeCompare(a.completed_at!));
  return groups;
}
