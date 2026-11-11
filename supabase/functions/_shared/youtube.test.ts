import { describe, expect, it } from "vitest";

import { channelIdFromPage, ERRORS, feedUrl, parseChannelInput, parseFeed } from "./youtube.ts";

const ID = "UCBJycsmduvYEL83R_U4JriQ";

describe("channel input", () => {
  it("takes an ID, a channel link and a handle", () => {
    expect(parseChannelInput(ID)).toEqual({ kind: "id", id: ID });
    expect(parseChannelInput(`https://www.youtube.com/channel/${ID}/videos`)).toEqual({ kind: "id", id: ID });
    expect(parseChannelInput("@kusinalab")).toEqual({ kind: "page", url: "https://www.youtube.com/@kusinalab" });
    expect(parseChannelInput("m.youtube.com/@kusinalab/videos")).toEqual({
      kind: "page",
      url: "https://www.youtube.com/@kusinalab",
    });
    expect(parseChannelInput("youtube.com/c/Old")).toEqual({ kind: "page", url: "https://www.youtube.com/c/Old" });
    expect(parseChannelInput("https://youtube.com/user/older")).toEqual({
      kind: "page",
      url: "https://www.youtube.com/user/older",
    });
  });

  it("names the problem with a video link or another site", () => {
    expect(parseChannelInput("youtube.com/watch?v=abc")).toEqual({ kind: "error", error: ERRORS.video });
    expect(parseChannelInput("https://youtu.be/abc")).toEqual({ kind: "error", error: ERRORS.video });
    expect(parseChannelInput("https://www.youtube.com/shorts/abc")).toEqual({ kind: "error", error: ERRORS.video });
    expect(parseChannelInput("https://vimeo.com/x")).toEqual({ kind: "error", error: ERRORS.notFound });
    expect(parseChannelInput("https://www.youtube.com/")).toEqual({ kind: "error", error: ERRORS.notFound });
    expect(parseChannelInput("http://[bad")).toEqual({ kind: "error", error: ERRORS.notFound });
    expect(parseChannelInput("  ")).toEqual({ kind: "error", error: ERRORS.empty });
  });
});

describe("channel page", () => {
  it("reads the ID from the canonical link, or from the page data", () => {
    expect(channelIdFromPage(`<link rel="canonical" href="https://www.youtube.com/channel/${ID}">`)).toBe(ID);
    expect(channelIdFromPage(`{"externalId":"${ID}"}`)).toBe(ID);
    expect(channelIdFromPage("<html></html>")).toBeNull();
    expect(feedUrl(ID)).toBe(`https://www.youtube.com/feeds/videos.xml?channel_id=${ID}`);
  });
});

describe("feed", () => {
  it("reads the title and the videos, and skips a broken entry", () => {
    const xml = `<feed><title>Kusina &amp; Lab</title>
      <entry><yt:videoId>_x58r9TBois</yt:videoId><title>Five ulam under &#8369;99</title><published>2026-11-06T21:29:30+00:00</published></entry>
      <entry><yt:videoId>bad</yt:videoId><title>x</title><published>2026-11-06T21:29:30+00:00</published></entry>
      <entry><yt:videoId>g6Die8gVFn0</yt:videoId><title>No date</title></entry>
      <entry><yt:videoId>g6Die8gVFn1</yt:videoId><title>Hex &#x27;quote&#x27; &lt;b&gt;</title><published>2026-11-05T00:00:00Z</published></entry>
    </feed>`;
    expect(parseFeed(xml, ID)).toEqual({
      title: "Kusina & Lab",
      videos: [
        {
          video_id: "_x58r9TBois",
          channel_id: ID,
          title: "Five ulam under ₱99",
          published_at: "2026-11-06T21:29:30.000Z",
        },
        { video_id: "g6Die8gVFn1", channel_id: ID, title: "Hex 'quote' <b>", published_at: "2026-11-05T00:00:00.000Z" },
      ],
    });
    expect(parseFeed("<feed></feed>", ID)).toEqual({ title: "", videos: [] });
  });
});
