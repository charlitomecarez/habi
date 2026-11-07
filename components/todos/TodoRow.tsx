import { Ionicons } from "@expo/vector-icons";
import { differenceInCalendarDays, format, isToday, isTomorrow } from "date-fns";
import { Pressable, View } from "react-native";

import { DataRow, type RowStatus } from "@/components/ui/DataRow";
import { useColors } from "@/lib/colors";
import { isOverdue, todoDate, type Todo } from "@/lib/todos";

const REPEAT_LABEL = { daily: "Daily", weekly: "Weekly", monthly: "Monthly" } as const;

function dayLabel(date: Date): string {
  if (isTomorrow(date)) return "Tomorrow";
  return format(date, "EEE, MMM d");
}

/** The line under the title: when it is due, and how often. */
function detailText(todo: Todo): string | undefined {
  if (todo.completed_at) {
    const done = new Date(todo.completed_at);
    return `Done ${isToday(done) ? format(done, "h:mm a") : format(done, "MMM d")}`;
  }
  const date = todoDate(todo);
  const remind = todo.remind_at ? new Date(todo.remind_at) : null;
  const when = !date
    ? undefined
    : isOverdue(todo)
      ? `Due ${format(date, "MMM d")}`
      : isToday(date)
        ? remind
          ? format(remind, "h:mm a")
          : "No time set"
        : remind
          ? `${dayLabel(date)}, ${format(remind, "h:mm a")}`
          : dayLabel(date);
  const repeat = todo.repeat !== "none" ? REPEAT_LABEL[todo.repeat] : undefined;
  const high = todo.priority === 1 ? "High" : undefined;
  return [high, repeat, when].filter(Boolean).join(" · ") || undefined;
}

/** A todo with a set time is pressing today. One with no time only says that it is today. */
function statusOf(todo: Todo): RowStatus | undefined {
  if (todo.completed_at) return undefined;
  if (isOverdue(todo)) return { label: "Overdue", tone: "over" };
  const date = todoDate(todo);
  if (date && isToday(date)) return { label: "Today", tone: todo.remind_at ? "over" : "muted" };
  return undefined;
}

function lateText(todo: Todo): string | undefined {
  const date = todoDate(todo);
  if (todo.completed_at || !date || !isOverdue(todo)) return undefined;
  const days = differenceInCalendarDays(new Date(), date);
  if (days < 1) return undefined;
  return days === 1 ? "1 day" : `${days} days`;
}

type TodoRowProps = {
  todo: Todo;
  onToggle: () => void;
  onOpen: () => void;
  last?: boolean;
};

export function TodoRow({ todo, onToggle, onOpen, last = false }: TodoRowProps) {
  const colors = useColors();
  const done = todo.completed_at !== null;

  return (
    <View className={`flex-row items-center ${last ? "" : "border-b-2 border-border"}`}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: done }}
        accessibilityLabel={done ? `Mark ${todo.title} as not done` : `Mark ${todo.title} as done`}
        onPress={onToggle}
        className="-ml-3 h-touch w-touch items-center justify-center"
      >
        <Ionicons
          name={done ? "checkbox" : "square-outline"}
          size={24}
          color={done ? colors.accent : colors.inkMuted}
        />
      </Pressable>
      <View className="min-w-0 flex-1">
        <DataRow
          title={todo.title}
          detail={detailText(todo)}
          value={lateText(todo)}
          status={statusOf(todo)}
          onPress={onOpen}
          done={done}
          last
        />
      </View>
    </View>
  );
}
