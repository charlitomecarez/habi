// Pure YouTube rules, shared by youtube-channel, youtube-sync and their tests. The app reads each
// channel's public RSS feed. It does not use the YouTube API or anyone's YouTube account.

export const MAX_CHANNELS = 30;
/** Videos older than this leave the cache. */
export const KEEP_DAYS = 60;

export const CHANNEL_ID = /^UC[0-9A-Za-z_-]{22}$/;
const VIDEO_ID = /^[0-9A-Za-z_-]{11}$/;

export const ERRORS = {
  video: "This is a video link. Paste the channel link, or type the @handle.",
  notFound: "I could not find that channel. Check the @handle.",
  limit: `You follow ${MAX_CHANNELS} channels. Remove one to add another.`,
  duplicate: "You already follow this channel.",
  empty: "Type a channel link or an @handle.",
} as const;

export type ChannelInput =
  { kind: "id"; id: string } | { kind: "page"; url: string } | { kind: "error"; error: string };

/**
 * Reads what you typed: a channel ID, an @handle, or a youtube.com link. A channel link with its ID
 * needs no page read. A handle or an old /c/ or /user/ link needs the channel page.
 */
export function parseChannelInput(text: string): ChannelInput {
  const value = text.trim();
  if (!value) return { kind: "error", error: ERRORS.empty };
  if (CHANNEL_ID.test(value)) return { kind: "id", id: value };
  if (/^@[\w.-]{3,30}$/.test(value)) return { kind: "page", url: `https://www.youtube.com/${value}` };
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
  } catch {
    return { kind: "error", error: ERRORS.notFound };
  }
  const host = url.hostname.replace(/^(www|m)\./, "");
  if (host === "youtu.be") return { kind: "error", error: ERRORS.video };
  if (host !== "youtube.com") return { kind: "error", error: ERRORS.notFound };
  const [first, second] = url.pathname.split("/").filter(Boolean);
  if (first === "watch" || first === "shorts" || first === "live" || first === "embed") {
    return { kind: "error", error: ERRORS.video };
  }
  if (first === "channel" && second && CHANNEL_ID.test(second)) return { kind: "id", id: second };
  if (first?.startsWith("@")) return { kind: "page", url: `https://www.youtube.com/${first}` };
  if ((first === "c" || first === "user") && second)
    return { kind: "page", url: `https://www.youtube.com/${first}/${second}` };
  return { kind: "error", error: ERRORS.notFound };
}

/** The channel ID from a channel page. YouTube puts it in the canonical link. */
export function channelIdFromPage(html: string): string | null {
  const canonical = html.match(
    /<link rel="canonical" href="https:\/\/www\.youtube\.com\/channel\/(UC[0-9A-Za-z_-]{22})"/,
  );
  if (canonical) return canonical[1];
  const meta = html.match(/"(?:externalId|channelId)":"(UC[0-9A-Za-z_-]{22})"/);
  return meta?.[1] ?? null;
}

export const feedUrl = (channelId: string) => `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;

export type FeedVideo = { video_id: string; channel_id: string; title: string; published_at: string };
export type Feed = { title: string; videos: FeedVideo[] };

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
function decode(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&(amp|lt|gt|quot|apos);/g, (_, e: string) => ENTITIES[e]);
}

const tag = (xml: string, name: string) => {
  const m = xml.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`));
  return m ? decode(m[1].trim()) : null;
};

/** The channel title and its videos from a feed. A broken entry is left out. */
export function parseFeed(xml: string, channelId: string): Feed {
  const head = xml.split("<entry>")[0];
  const videos: FeedVideo[] = [];
  for (const entry of xml.split("<entry>").slice(1)) {
    const id = tag(entry, "yt:videoId");
    const title = tag(entry, "title");
    const published = tag(entry, "published");
    if (!id || !VIDEO_ID.test(id) || !title || !published || Number.isNaN(Date.parse(published))) continue;
    videos.push({ video_id: id, channel_id: channelId, title, published_at: new Date(published).toISOString() });
  }
  return { title: tag(head, "title") ?? "", videos };
}
