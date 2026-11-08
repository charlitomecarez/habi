-- News story page (v1.4.0 design revision 2). The short summary that the feed itself gives,
-- as plain text. Never the article body. Existing rows fill on the next news-sync run.
alter table public.news_items
  add column summary text check (char_length(summary) between 1 and 400);
