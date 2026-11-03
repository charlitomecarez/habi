import { Ionicons } from "@expo/vector-icons";
import { format, isToday, isTomorrow } from "date-fns";
import { Pressable, Text, View } from "react-native";

import { Badge } from "@/components/ui/Badge";
import { colors } from "@/lib/colors";
import { isOverdue, todoDate, type Todo } from "@/lib/todos";

const REPEAT_LABEL = { daily: "Daily", weekly: "Weekly", monthly: "Monthly" } as const;

function dayLabel(date: Date): string {
  if (isToday(date)) return "Today";
  if (isTomorrow(date)) return "Tomorrow";
  return format(date, "EEE, MMM d");
}

function meta(todo: Todo): { icon: "notifications-outline" | "repeat" | null; text: string } | null {
  if (todo.completed_at) {
    const done = new Date(todo.completed_at);
    return { icon: null, text: `Done ${isToday(done) ? format(done, "h:mm a") : format(done, "MMM d")}` };
  }
  const remind = todo.remind_at ? new Date(todo.remind_at) : null;
  const date = todoDate(todo);
  if (!date) return null;

  if (todo.repeat !== "none") {
    const when = remind ? format(remind, "h:mm a") : dayLabel(date);
    return { icon: "repeat", text: `${REPEAT_LABEL[todo.repeat]}, ${when}` };
  }
  if (remind) {
    return { icon: "notifications-outline", text: `${dayLabel(remind)}, ${format(remind, "h:mm a")}` };
  }
  return { icon: null, text: dayLabel(date) };
}

type TodoRowProps = {
  todo: Todo;
  onToggle: () => void;
  onOpen: () => void;
  last?: boolean;
};

export function TodoRow({ todo, onToggle, onOpen, last = false }: TodoRowProps) {
  const done = todo.completed_at !== null;
  const overdue = isOverdue(todo);
  const date = todoDate(todo);
  const dueToday = !done && date !== null && isToday(date);
  const info = meta(todo);

  return (
    <View className={`flex-row items-start gap-2 py-1 pl-1 pr-4 ${last ? "" : "border-b border-divider"}`}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: done }}
        accessibilityLabel={done ? `Mark ${todo.title} as not done` : `Mark ${todo.title} as done`}
        onPress={onToggle}
        className="h-touch w-touch items-center justify-center"
      >
        <Ionicons
          name={done ? "checkbox" : "square-outline"}
          size={24}
          color={done ? colors.accent : colors.inkMuted}
        />
      </Pressable>

      <Pressable accessibilityRole="button" onPress={onOpen} className="min-h-touch flex-1 justify-center gap-1 py-2">
        <Text
          className={`text-row-title ${done ? "font-medium text-ink-muted line-through" : "font-semibold text-ink"}`}
        >
          {todo.title}
        </Text>
        {info ? (
          <View className="flex-row items-center gap-1">
            {info.icon ? (
              <Ionicons name={info.icon} size={14} color={dueToday ? colors.warning : colors.inkMuted} />
            ) : null}
            <Text className={`text-caption ${dueToday ? "font-medium text-warning" : "font-sans text-ink-muted"}`}>
              {info.text}
            </Text>
          </View>
        ) : null}
      </Pressable>

      {!done && (overdue || todo.priority === 1) ? (
        <View className="items-end gap-1 pt-3">
          {overdue ? <Badge label="Overdue" tone="danger" /> : null}
          {todo.priority === 1 ? <Badge label="High" tone="danger" /> : null}
        </View>
      ) : null}
    </View>
  );
}
