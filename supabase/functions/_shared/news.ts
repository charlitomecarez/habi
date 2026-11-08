// RSS reading for news-sync. Pure, so Vitest runs it. A feed is untrusted text: titles become plain
// text, and only https links and images are kept. Nothing here copies article text.

export type NewsSection = "ph" | "world";
export type Feed = { source: string; section: NewsSection; url: string };

/** Philippines first, then the world. A feed that is down does not stop the others. */
export const FEEDS: readonly Feed[] = [
  { source: "Inquirer", section: "ph", url: "https://www.inquirer.net/fullfeed" },
  { source: "Rappler", section: "ph", url: "https://www.rappler.com/feed/" },
  { source: "GMA News", section: "ph", url: "https://data.gmanetwork.com/gno/rss/news/feed.xml" },
  { source: "Philstar", section: "ph", url: "https://www.philstar.com/rss/headlines" },
  { source: "BBC News", section: "world", url: "https://feeds.bbci.co.uk/news/world/rss.xml" },
  { source: "Al Jazeera", section: "world", url: "https://www.aljazeera.com/xml/rss/all.xml" },
  { source: "The Guardian", section: "world", url: "https://www.theguardian.com/world/rss" },
];

/** Stories kept per feed in one run. */
export const PER_FEED = 30;
/** Stories older than this are deleted. */
export const KEEP_DAYS = 3;

export type NewsItem = {
  section: NewsSection;
  source: string;
  title: string;
  url: string;
  image_url: string | null;
  published_at: string;
};

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  ndash: "–",
  mdash: "—",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
  hellip: "…",
};

export function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, code: string) => {
    if (code[0] === "#") {
      const n = code[1] === "x" || code[1] === "X" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : "";
    }
    return ENTITIES[code.toLowerCase()] ?? whole;
  });
}

const unwrapCdata = (text: string) => text.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");

/** Plain text from a feed field: CDATA unwrapped, entities decoded, tags removed, spaces joined. */
export function plainText(raw: string): string {
  const once = decodeEntities(unwrapCdata(raw));
  // Some feeds encode HTML twice, so tags can appear only after the first decode.
  return decodeEntities(once.replace(/<[^>]*>/g, " "))
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function field(item: string, tag: string): string | null {
  const match = item.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "i"));
  return match ? match[1] : null;
}

function attr(tag: string, name: string): string | null {
  const match = tag.match(new RegExp(`\\s${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, "i"));
  return match ? decodeEntities(match[2] ?? match[3] ?? "") : null;
}

const MAX_URL = 1000;

/** Only an https address, under 1,000 characters. */
export function httpsUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const url = decodeEntities(unwrapCdata(raw)).trim();
  if (url.length > MAX_URL || !/^https:\/\/[^\s"'<>]+$/i.test(url)) return null;
  return url;
}

// A 1 px image, or one with no size at all marked as 0, is a tracking pixel.
const isPixel = (tag: string) => {
  const w = Number(attr(tag, "width"));
  const h = Number(attr(tag, "height"));
  return (attr(tag, "width") !== null && w <= 1) || (attr(tag, "height") !== null && h <= 1);
};

/**
 * The story's image: media:thumbnail first, then the smallest media:content image by width, then an
 * image enclosure, then the first <img> in the description or the content. Null when there is none.
 */
export function pickImage(item: string): string | null {
  for (const tag of item.match(/<media:thumbnail\b[^>]*>/gi) ?? []) {
    const url = httpsUrl(attr(tag, "url"));
    if (url && !isPixel(tag)) return url;
  }

  const contents = (item.match(/<media:content\b[^>]*>/gi) ?? [])
    .filter((tag) => {
      const medium = attr(tag, "medium");
      const type = attr(tag, "type");
      return (!medium || medium === "image") && (!type || type.startsWith("image/")) && !isPixel(tag);
    })
    .map((tag) => ({ url: httpsUrl(attr(tag, "url")), width: Number(attr(tag, "width")) || Infinity }))
    .filter((c): c is { url: string; width: number } => c.url !== null)
    .sort((a, b) => a.width - b.width);
  if (contents.length) return contents[0].url;

  for (const tag of item.match(/<enclosure\b[^>]*>/gi) ?? []) {
    if (!(attr(tag, "type") ?? "").startsWith("image/")) continue;
    const url = httpsUrl(attr(tag, "url"));
    if (url) return url;
  }

  // GMA puts an <img> inside media:content and the description, as encoded HTML.
  const html = decodeEntities(unwrapCdata(item));
  for (const tag of html.match(/<img\b[^>]*>/gi) ?? []) {
    const url = httpsUrl(attr(tag, "src"));
    if (url && !isPixel(tag)) return url;
  }
  return null;
}

/** A feed time, or the fetch time when it is missing, wrong or in the future. */
export function publishedAt(raw: string | null, now: number): string {
  const at = raw ? Date.parse(plainText(raw)) : NaN;
  return new Date(Number.isFinite(at) && at <= now ? at : now).toISOString();
}

const MAX_TITLE = 300;

/** The stories in one RSS feed, newest first, at most PER_FEED. A story with no title or no https link is skipped. */
export function parseFeed(xml: string, feed: Feed, now = Date.now()): NewsItem[] {
  const items = xml.match(/<item\b[\s\S]*?<\/item>/gi) ?? [];
  const out: NewsItem[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    const title = plainText(field(item, "title") ?? "")
      .slice(0, MAX_TITLE)
      .trim();
    const link = field(item, "link");
    const url = httpsUrl(link) ?? httpsUrl(attr(item.match(/<link\b[^>]*>/i)?.[0] ?? "", "href"));
    if (!title || !url || seen.has(url)) continue;
    seen.add(url);
    out.push({
      section: feed.section,
      source: feed.source,
      title,
      url,
      image_url: pickImage(item),
      published_at: publishedAt(field(item, "pubDate") ?? field(item, "dc:date"), now),
    });
  }
  return out.sort((a, b) => b.published_at.localeCompare(a.published_at)).slice(0, PER_FEED);
}
