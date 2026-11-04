import { useQuery } from "@tanstack/react-query";
import { format, isSunday } from "date-fns";

import { supabase } from "@/lib/supabase";
import { reviewSections, type ReviewSection, type WeeklyReview } from "@/supabase/functions/_shared/weekly";

export type { ReviewSection, WeeklyReview };

/** Shown on Sundays, the same as the Sunday email. */
export const showWeeklyReview = (now = new Date()) => isSunday(now);

/** This week's review from weekly_review(), the same query the emails use. */
export function useWeeklyReview(enabled: boolean) {
  const today = format(new Date(), "yyyy-MM-dd");
  return useQuery({
    queryKey: ["weekly-review", today],
    enabled,
    queryFn: async (): Promise<{ review: WeeklyReview; sections: ReviewSection[] }> => {
      const { data, error } = await supabase.rpc("weekly_review", { p_week_start: today });
      if (error) throw error;
      const review = data as unknown as WeeklyReview;
      return { review, sections: reviewSections(review) };
    },
  });
}
