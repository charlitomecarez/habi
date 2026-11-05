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
import { usePeople } from "@/lib/people";
import { useShopping } from "@/lib/shopping";
import { useTrips } from "@/lib/travel";
import { useUlamDays } from "@/lib/ulam";
import { useVaultEntries, useVaultStore } from "@/lib/vault";

/** "1 item", "2 items". Undefined while the count is loading. */
export function countText(count: number | undefined, one: string, many = `${one}s`): string | undefined {
  return count === undefined ? undefined : `${count} ${count === 1 ? one : many}`;
}

/** The line under each tile on More: how much is inside the module. */
export function useModuleDetails(): Record<string, string | undefined> {
  const habits = useHabits();
  const gym = useGym();
  const journal = useJournal();
  const health = useHealth();
  const ulam = useUlamDays();
  const people = usePeople();
  const debts = useDebts();
  const items = useItems();
  const shopping = useShopping();
  const trips = useTrips();
  const documents = useDocuments();
  const videos = useVideos();
  const unlocked = useVaultStore((s) => s.key !== null);
  const vault = useVaultEntries();

  const eaten = ulam.data?.filter((d) => d.eaten).length;
  return {
    habits: countText(habits.data?.habits.length, "habit"),
    gym: countText(gym.data?.plans.length, "plan"),
    journal: countText(journal.data?.length, "entry", "entries"),
    health: countText(health.data?.medicines.length, "medicine"),
    alarms: countText(getAlarms().filter(isUserAlarm).length, "alarm"),
    ulam: eaten === undefined ? undefined : `${eaten} of 7 days`,
    people: countText(people.data?.people.length, "person", "people"),
    debts: debts.data ? `${debts.data.filter((d) => d.balance > 0).length} open` : undefined,
    inventory: countText(items.data?.length, "item"),
    shopping: shopping.data ? `${shopping.data.items.filter((i) => !i.ticked).length} to buy` : undefined,
    travel: countText(trips.data?.length, "trip"),
    documents: countText(documents.data?.length, "document"),
    vault: unlocked ? countText(vault.entries.length, "login") : "Locked",
    content: countText(videos.data?.length, "video"),
  };
}
