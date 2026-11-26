const REGIONS = [
  { geo: "BD", label: "Bangladesh" },
  { geo: "IN", label: "India" },
  { geo: "US", label: "US" },
  { geo: "GB", label: "UK" }
];
const CACHE_TTL_SECONDS = 12 * 60 * 60;

function decodeXml(value) {
  return String(value || "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#x([\da-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(parseInt(code, 10)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/<[^>]*>/g, "")
    .trim();
}

function readTag(xml, tag) {
  const match = xml.match(new RegExp(`<(?:(?:\\w+):)?${tag}\\b[^>]*>([\\s\\S]*?)<\\/(?:(?:\\w+):)?${tag}\\s*>`, "i"));
  return match ? decodeXml(match[1]) : "";
}

function parseFeed(xml, region) {
  const items = [...xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)];
  return items.slice(0, 2).map((match) => ({
    title: readTag(match[1], "title").slice(0, 120),
    geo: region.geo,
    country: region.label
  })).filter((item) => item.title);
}

function json(data, status = 200, cacheControl = "no-store") {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": cacheControl }
  });
}

export async function onRequestGet(context) {
  const request = context.request;
  const requestUrl = new URL(request.url);
  const cacheKey = new Request(`${requestUrl.origin}/api/trending?cache=google-trends-v2`);
  const cache = caches.default;
  const cached = await cache.match(cacheKey);
  if (cached) {
    const headers = new Headers(cached.headers);
    headers.set("X-Trends-Cache", "HIT");
    return new Response(cached.body, { status: cached.status, headers });
  }

  const feeds = [];
  for (const region of REGIONS) {
    try {
      const response = await fetch(`https://trends.google.com/trending/rss?geo=${region.geo}`, {
        headers: {
          "Accept": "application/rss+xml, application/xml, text/xml",
          "User-Agent": "TheGlobalDesk/1.0 (+https://thegdesk.com/)"
        },
        signal: AbortSignal.timeout(10000)
      });
      if (!response.ok) throw new Error(`Google Trends ${region.geo}: ${response.status}`);
      feeds.push({ region, topics: parseFeed(await response.text(), region) });
    } catch (error) {
      console.warn(`Trending feed unavailable for ${region.geo}`, error);
    }
  }

  const uniqueTopics = new Map();
  for (const feed of feeds) {
    for (const topic of feed.topics) {
      const key = topic.title.toLocaleLowerCase();
      const existing = uniqueTopics.get(key);
      if (existing) {
        existing.regions.push({ geo: topic.geo, label: topic.country });
      } else {
        uniqueTopics.set(key, { ...topic, regions: [{ geo: topic.geo, label: topic.country }] });
      }
    }
  }

  const topics = [...uniqueTopics.values()].slice(0, 8);
  if (!topics.length) return json({ error: "Trending searches are temporarily unavailable" }, 502);

  const response = json({
    source: "Google Trends",
    regionsAvailable: feeds.map((feed) => feed.region),
    updatedAt: new Date().toISOString(),
    refreshAfterSeconds: CACHE_TTL_SECONDS,
    topics
  }, 200, `public, max-age=${CACHE_TTL_SECONDS}`);
  if (context.waitUntil) context.waitUntil(cache.put(cacheKey, response.clone()));
  else await cache.put(cacheKey, response.clone());
  return response;
}
