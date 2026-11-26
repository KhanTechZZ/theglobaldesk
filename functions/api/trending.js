const CACHE_TTL_SECONDS = 12 * 60 * 60;
const ISSUES = [
  { title: "Climate crisis", query: '("climate change" OR "global warming" OR climate crisis)' },
  { title: "Israel–Palestine war", query: '(Palestine OR Gaza OR "Israel-Hamas")' },
  { title: "Russia–Ukraine war", query: '("Russia-Ukraine" OR "Ukraine war" OR "Russian invasion")' }
];

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchCoverage(issue) {
  const params = new URLSearchParams({ query: issue.query, mode: "TimelineVolRaw", format: "json", timespan: "24h" });
  const response = await fetch(`https://api.gdeltproject.org/api/v2/doc/doc?${params}`, {
    headers: { Accept: "application/json", "User-Agent": "TheGlobalDesk/1.0 (+https://thegdesk.com/)" },
    signal: AbortSignal.timeout(4000)
  });
  if (!response.ok) throw new Error(`GDELT returned ${response.status}`);
  const result = await response.json();
  const series = result.timeline?.find((item) => item.data?.length);
  if (!series) throw new Error("GDELT returned no coverage timeline");
  const total = series.data.reduce((sum, point) => sum + Number(point.value || 0), 0);
  return {
    title: issue.title,
    source: "Global news coverage",
    volume: `${total.toLocaleString()} articles`,
    detail: "Worldwide · past 24 hours",
    url: `https://api.gdeltproject.org/api/v2/doc/doc?${new URLSearchParams({ query: issue.query, mode: "TimelineVolRaw", format: "html", timespan: "24h" })}`
  };
}

function json(data, status = 200, cacheControl = "no-store") {
  return Response.json(data, { status, headers: { "Cache-Control": cacheControl } });
}

export async function onRequestGet(context) {
  const origin = new URL(context.request.url).origin;
  const cacheKey = new Request(`${origin}/api/trending?cache=serious-world-issues-v3`);
  const cache = caches.default;
  const cached = await cache.match(cacheKey);
  if (cached) {
    const headers = new Headers(cached.headers);
    headers.set("X-Trends-Cache", "HIT");
    return new Response(cached.body, { status: cached.status, headers });
  }

  const topics = [];
  for (const [index, issue] of ISSUES.entries()) {
    try {
      topics.push(await fetchCoverage(issue));
    } catch (error) {
      console.warn(`Global issue coverage unavailable: ${issue.title}`, error);
    }
    if (index < ISSUES.length - 1) await wait(5000);
  }
  if (!topics.length) return json({ error: "Global issue coverage is temporarily unavailable" }, 502);

  const response = json({
    scope: "Global news coverage",
    metric: "Distinct monitored news articles mentioning each issue, worldwide, over the past 24 hours",
    sourcesAvailable: ["GDELT global news monitoring"],
    updatedAt: new Date().toISOString(),
    refreshAfterSeconds: CACHE_TTL_SECONDS,
    topics
  }, 200, `public, max-age=${CACHE_TTL_SECONDS}`);
  if (context.waitUntil) context.waitUntil(cache.put(cacheKey, response.clone()));
  else await cache.put(cacheKey, response.clone());
  return response;
}
