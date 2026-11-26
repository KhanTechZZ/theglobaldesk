const CACHE_TTL_SECONDS = 12 * 60 * 60;
const USER_AGENT = "TheGlobalDesk/1.0 (+https://thegdesk.com/)";

async function fetchJson(url, timeout = 12000) {
  const response = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(timeout)
  });
  if (!response.ok) throw new Error(`Trend provider returned ${response.status}`);
  return response.json();
}

async function fetchMastodon() {
  const tags = await fetchJson("https://mastodon.social/api/v1/trends/tags?limit=3");
  return tags.slice(0, 3).map((tag) => {
    const recent = tag.history?.[0] || {};
    const uses = Number(recent.uses || 0);
    const accounts = Number(recent.accounts || 0);
    return {
      title: `#${tag.name}`,
      source: "Mastodon",
      volume: uses ? `${uses.toLocaleString()} posts` : `${accounts.toLocaleString()} accounts`,
      detail: "Trending hashtag",
      url: tag.url || `https://mastodon.social/tags/${encodeURIComponent(tag.name)}`
    };
  });
}

async function fetchHackerNews() {
  const ids = await fetchJson("https://hacker-news.firebaseio.com/v0/topstories.json");
  const stories = await Promise.all(ids.slice(0, 3).map(async (id) => {
    try {
      const story = await fetchJson(`https://hacker-news.firebaseio.com/v0/item/${id}.json`, 8000);
      if (!story?.title) return null;
      const signals = [`${Number(story.score || 0).toLocaleString()} points`];
      if (story.descendants) signals.push(`${Number(story.descendants).toLocaleString()} comments`);
      return {
        title: story.title,
        source: "Hacker News",
        volume: signals.join(" · "),
        detail: "Community discussion",
        url: story.url || `https://news.ycombinator.com/item?id=${id}`
      };
    } catch { return null; }
  }));
  return stories.filter(Boolean);
}

async function fetchGlobalNews() {
  const url = "https://api.gdeltproject.org/api/v2/doc/doc?query=world&mode=ArtList&format=json&maxrecords=3&timespan=24h";
  const data = await fetchJson(url, 25000);
  const articles = data.articles || [];
  return articles.slice(0, 3).map((article) => ({
    title: article.title,
    source: "Global news",
    volume: article.sourcecountry || article.domain || "Worldwide",
    detail: "News coverage · past 24 hours",
    url: article.url
  })).filter((item) => item.title && item.url);
}

function json(data, status = 200, cacheControl = "no-store") {
  return Response.json(data, { status, headers: { "Cache-Control": cacheControl } });
}

export async function onRequestGet(context) {
  const requestUrl = new URL(context.request.url);
  const cacheKey = new Request(`${requestUrl.origin}/api/trending?cache=worldwide-signals-v4`);
  const cache = caches.default;
  const cached = await cache.match(cacheKey);
  if (cached) {
    const headers = new Headers(cached.headers);
    headers.set("X-Trends-Cache", "HIT");
    return new Response(cached.body, { status: cached.status, headers });
  }

  const providers = await Promise.allSettled([fetchMastodon(), fetchHackerNews(), fetchGlobalNews()]);
  const labels = ["Mastodon", "Hacker News", "Global news"];
  const topics = [];
  const sourcesAvailable = [];
  providers.forEach((result, index) => {
    if (result.status === "fulfilled") {
      sourcesAvailable.push(labels[index]);
      topics.push(...result.value);
    } else {
      console.warn(`Trending source unavailable: ${labels[index]}`, result.reason);
    }
  });

  if (!topics.length) return json({ error: "Worldwide trends are temporarily unavailable" }, 502);
  const response = json({
    scope: "Worldwide signals from public sources",
    sourcesAvailable,
    updatedAt: new Date().toISOString(),
    refreshAfterSeconds: CACHE_TTL_SECONDS,
    topics: topics.slice(0, 9)
  }, 200, `public, max-age=${CACHE_TTL_SECONDS}`);
  if (context.waitUntil) context.waitUntil(cache.put(cacheKey, response.clone()));
  else await cache.put(cacheKey, response.clone());
  return response;
}
