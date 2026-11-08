# News

News shows headlines from public RSS feeds: the Philippines first, then the world. It is read-only. A story opens its story page, and the full article opens in an in-app browser. It sends no notifications.

- `news-sync` runs every 2 hours at minute 20 through `pg_cron`. The app never calls a news site. There is no key and no Groq.
- Feeds, in `supabase/functions/_shared/news.ts`: Inquirer, Rappler, GMA News and Philstar (Philippines); BBC News, Al Jazeera and The Guardian (World). Inquirer uses `/fullfeed`, because its news feed labels Philippine time as UTC.
- Each feed has a 10-second timeout. A feed that fails sets `news_sync.last_error_at` and keeps its last stories. The screen shows a neutral notice for it, and the other feeds still save.
- `news_items` and `news_sync` are shared, like Sports. Signed-in accounts read them, and only the service role writes them. No `user_id`, because a headline is not personal.
- A story keeps the headline, the outlet, the time, the link, an image address and the feed's own short summary (`summary`, at most 400 characters). It never stores the article body, because outlets publish RSS for headlines and links. Titles and summaries are plain text, and only `https` links and images are kept.
- `summaryText` takes the feed `description`, keeps only the first paragraph (The Guardian sends several), removes "The post … appeared first on …" and read-more lines, and cuts at a sentence end under 400 characters.
- The image is `media:thumbnail` first, then the smallest `media:content` image, then an image enclosure, then the first `<img>` in the description. A 1 px tracking image is skipped. The function never opens the story page.
- The unique `url` drops a story that two runs find. Stories older than 3 days are deleted, which keeps the table under about 1,000 rows.
- A time in the future becomes the fetch time.

## Screen

- Up to 20 stories in each section, newest first. A headline wraps to 2 lines. Pull down to read the table again.
- An image is a 64 px square at the right of the row, through the `trailing` part of `DataRow`. While it loads, and if it fails, the square stays muted, so the rows never jump. It fades in over 150 ms, or at once with reduce motion on. TalkBack reads only the headline.
- The image loads from the outlet's own server, so the outlet sees the phone open it. `expo-image` keeps it in its disk cache.

## Story page

- `/news/[id]` shows the image (16:9, only when the story has one), the headline, the outlet and time, and the summary when the feed sent one. A story older than 3 days is gone, and the page says so.
- "Read the full story" is the one primary action. It opens the article with `expo-web-browser` (Chrome Custom Tabs on Android, a new tab on the web). Back returns to the story, and Chrome logins work there.
- Rows on News and on Home open the story page.

## More and Home

- The More tile counts today's stories. Home shows the 3 newest Philippine headlines (milestone 9).
