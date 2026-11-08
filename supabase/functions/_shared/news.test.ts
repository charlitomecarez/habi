import { describe, expect, it } from "vitest";

import { decodeEntities, httpsUrl, parseFeed, pickImage, plainText, publishedAt, type Feed } from "./news";

// Every outlet, headline and address here is made up.
const feed: Feed = { source: "Example News", section: "ph", url: "https://example.com/feed" };
const now = Date.parse("2026-11-08T06:00:00Z");

const rss = (items: string) => `<?xml version="1.0"?><rss><channel><title>Example</title>${items}</channel></rss>`;

describe("parseFeed", () => {
  it("reads title, link, time and image, newest first", () => {
    const xml = rss(`
      <item><title><![CDATA[Rain in &amp; around the city]]></title>
        <link>https://example.com/a</link><pubDate>Sun, 08 Nov 2026 12:00:00 +0800</pubDate>
        <media:thumbnail width="240" height="135" url="https://img.example.com/a.jpg"/></item>
      <item><title>New fare from Monday</title><link>https://example.com/b</link>
        <pubDate>Sun, 08 Nov 2026 05:30:00 GMT</pubDate></item>`);
    const items = parseFeed(xml, feed, now);
    expect(items.map((i) => i.title)).toEqual(["New fare from Monday", "Rain in & around the city"]);
    expect(items[1]).toMatchObject({
      section: "ph",
      source: "Example News",
      url: "https://example.com/a",
      image_url: "https://img.example.com/a.jpg",
      published_at: "2026-11-08T04:00:00.000Z",
    });
    expect(items[0].image_url).toBeNull();
  });

  it("skips a story with no title, an http link, or a repeat", () => {
    const xml = rss(`
      <item><title></title><link>https://example.com/a</link></item>
      <item><title>Plain http</title><link>http://example.com/b</link></item>
      <item><title>Kept</title><link>https://example.com/c</link></item>
      <item><title>Kept again</title><link>https://example.com/c</link></item>`);
    expect(parseFeed(xml, feed, now).map((i) => i.title)).toEqual(["Kept"]);
  });

  it("removes HTML from a title", () => {
    const xml = rss(
      `<item><title>&lt;b&gt;Bold&lt;/b&gt; title <script>x</script></title><link>https://example.com/a</link></item>`,
    );
    expect(parseFeed(xml, feed, now)[0].title).toBe("Bold title x");
  });
});

describe("pickImage", () => {
  it("takes the thumbnail first", () => {
    const item = `<media:content url="https://img.example.com/big.jpg" width="900"/><media:thumbnail url="https://img.example.com/t.jpg"/>`;
    expect(pickImage(item)).toBe("https://img.example.com/t.jpg");
  });

  it("takes the smallest media:content image by width", () => {
    const item = `<media:content width="460" url="https://img.example.com/460.jpg"/><media:content width="140" url="https://img.example.com/140.jpg"/>`;
    expect(pickImage(item)).toBe("https://img.example.com/140.jpg");
  });

  it("skips video media and takes an image enclosure", () => {
    const item = `<media:content medium="video" url="https://v.example.com/a.mp4"/><enclosure type="image/jpeg" url="https://img.example.com/e.jpg"/>`;
    expect(pickImage(item)).toBe("https://img.example.com/e.jpg");
  });

  it("falls back to the first img in the description, encoded or in CDATA", () => {
    expect(pickImage(`<description>&lt;img src="https://img.example.com/d.jpg"/&gt; Text</description>`)).toBe(
      "https://img.example.com/d.jpg",
    );
    expect(
      pickImage(`<description><![CDATA[<img height="150" src="https://img.example.com/c.jpg"/>]]></description>`),
    ).toBe("https://img.example.com/c.jpg");
  });

  it("skips a tracking pixel and an http image", () => {
    const item = `<description>&lt;img width="1" height="1" src="https://track.example.com/p.gif"/&gt;&lt;img src="http://img.example.com/x.jpg"/&gt;</description>`;
    expect(pickImage(item)).toBeNull();
    expect(pickImage(`<media:thumbnail width="1" height="1" url="https://track.example.com/p.gif"/>`)).toBeNull();
  });

  it("is null with no image", () => {
    expect(pickImage("<title>No picture</title>")).toBeNull();
  });
});

describe("helpers", () => {
  it("decodes entities", () => {
    expect(decodeEntities("Tom &amp; Jerry &#8217;s &#x2014; &hellip;")).toBe("Tom & Jerry ’s — …");
  });

  it("makes plain text", () => {
    expect(plainText("<![CDATA[<p>One</p>  <p>two</p>]]>")).toBe("One two");
  });

  it("keeps only https addresses under 1,000 characters", () => {
    expect(httpsUrl("https://example.com/a?b=1&amp;c=2")).toBe("https://example.com/a?b=1&c=2");
    expect(httpsUrl("javascript:alert(1)")).toBeNull();
    expect(httpsUrl(`https://example.com/${"a".repeat(1000)}`)).toBeNull();
  });

  it("uses the fetch time for a missing or future time", () => {
    expect(publishedAt(null, now)).toBe(new Date(now).toISOString());
    expect(publishedAt("Mon, 09 Nov 2026 10:00:00 GMT", now)).toBe(new Date(now).toISOString());
    expect(publishedAt("not a date", now)).toBe(new Date(now).toISOString());
  });
});
