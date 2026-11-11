import { isToday, parseISO } from "date-fns";
import { getAlarms } from "@/lib/alarm";
import { isUserAlarm } from "@/lib/alarm-rules";
import { useVideos } from "@/lib/content";
import { useDebts } from "@/lib/debts";
import { useDocuments } from "@/lib/documents";
import { useGym } from "@/lib/gym";
import { useHabits } from "@/lib/habits";
import { useHealth } from "@/lib/health";
import { useItems } from "@/lib/inventory";
import { useJournal } from "@/lib/journal";
import { formatPeso, toDateString } from "@/lib/money";
import { usePeople } from "@/lib/people";
import { useShopping } from "@/lib/shopping";
import { useTrips } from "@/lib/travel";
import { useUserSettings } from "@/lib/settings";
import { todayChoice, useUlamDays } from "@/lib/ulam";
import { useVaultEntries, useVaultStore } from "@/lib/vault";
import { unreadCount, useInbox } from "@/lib/voice";
import { useWeather } from "@/lib/weather";
import { useNews } from "@/lib/news";
import { useMovies } from "@/lib/movies";

/** The count at the end of a line on More. Undefined while it is loading. */
export function countText(count: number | undefined): string | undefined {
  return count === undefined ? undefined : count.toLocaleString("en-PH");
}

/** The number on each line of More: how much is inside the module. */
export function useModuleDetails(): Record<string, string | undefined> {
  const habits = useHabits();
  const gym = useGym();
  const journal = useJournal();
  const health = useHealth();
  const ulam = useUlamDays();
  const settings = useUserSettings();
  const people = usePeople();
  const debts = useDebts();
  const inbox = useInbox();
  const items = useItems();
  const shopping = useShopping();
  const trips = useTrips();
  const documents = useDocuments();
  const videos = useVideos();
  const weather = useWeather();
  const news = useNews();
  const movies = useMovies();
  const unlocked = useVaultStore((s) => s.key !== null);
  const vault = useVaultEntries();

  const now = new Date();
  const ulamToday = ulam.data?.find((d) => d.on_date === toDateString(now));
  return {
    habits: countText(habits.data?.habits.length),
    gym: countText(gym.data?.plans.length),
    journal: countText(journal.data?.length),
    health: countText(health.data?.medicines.length),
    alarms: countText(getAlarms().filter(isUserAlarm).length),
    ulam: ulam.data ? formatPeso(todayChoice(ulamToday, now, settings.data?.ulamLimit ?? 99).ulam.cost) : undefined,
    weather: weather.data?.forecast ? `${weather.data.forecast.temperature}°` : undefined,
    news: news.data
      ? `${[...news.data.ph, ...news.data.world].filter((n) => isToday(parseISO(n.published_at))).length} today`
      : undefined,
    movies: movies.data ? `${movies.data.now.length} showing` : undefined,
    people: countText(people.data?.people.length),
    debts: countText(debts.data?.filter((d) => d.balance > 0).length),
    inbox: inbox.data ? `${unreadCount(inbox.data)} new` : undefined,
    inventory: countText(items.data?.length),
    shopping: countText(shopping.data?.items.filter((i) => !i.ticked).length),
    travel: countText(trips.data?.length),
    documents: countText(documents.data?.length),
    vault: unlocked ? countText(vault.entries.length) : "Locked",
    content: countText(videos.data?.length),
  };
}
