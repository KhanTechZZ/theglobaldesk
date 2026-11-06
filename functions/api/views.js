const WORKSPACE = "md-zikrullahs-team-6054";
const LEGACY_COUNTER = "first-counter-6054";
const API_BASE = "https://api.counterapi.dev/v2";

function normalizeSlug(value) {
  return String(value || "")
    .replace(/\.md$/i, "")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store" }
  });
}

// Keep the existing global views counter on CounterAPI.
async function getLegacyCounter(env) {
  if (!env.COUNTERAPI_TOKEN) {
    return json({ error: "COUNTERAPI_TOKEN is missing" }, 500);
  }

  try {
    const response = await fetch(
      `${API_BASE}/${WORKSPACE}/${LEGACY_COUNTER}`,
      {
        headers: {
          Authorization: `Bearer ${env.COUNTERAPI_TOKEN}`,
          Accept: "application/json"
        }
      }
    );

    return new Response(await response.text(), {
      status: response.status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store"
      }
    });
  } catch {
    return json({ error: "Could not read global views" }, 502);
  }
}

async function ensureArticle(env, slug) {
  await env.DB.prepare(`
    INSERT INTO article_views (slug, views)
    VALUES (?, 0)
    ON CONFLICT(slug) DO NOTHING
  `).bind(slug).run();
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const requestedSlug = url.searchParams.get("slug");

  // No slug means the legacy global counter.
  if (!requestedSlug) {
    return getLegacyCounter(env);
  }

  if (!env.DB) {
    return json({ error: "D1 binding DB is missing" }, 500);
  }

  const slug = normalizeSlug(requestedSlug);

  if (!slug) {
    return json({ error: "Invalid article slug" }, 400);
  }

  try {
    await ensureArticle(env, slug);

    const row = await env.DB.prepare(
      "SELECT views FROM article_views WHERE slug = ?"
    ).bind(slug).first();

    return json({
      ok: true,
      slug,
      views: Number(row?.views ?? 0)
    });
  } catch (error) {
    return json({
      error: "Could not read article views",
      details: error.message
    }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  if (!env.DB) {
    return json({ error: "D1 binding DB is missing" }, 500);
  }

  let body;

  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const slug = normalizeSlug(body?.slug);

  if (!slug) {
    return json({ error: "Invalid article slug" }, 400);
  }

  try {
    await env.DB.prepare(`
      INSERT INTO article_views (slug, views, updated_at)
      VALUES (?, 1, CURRENT_TIMESTAMP)
      ON CONFLICT(slug) DO UPDATE SET
        views = article_views.views + 1,
        updated_at = CURRENT_TIMESTAMP
    `).bind(slug).run();

    const row = await env.DB.prepare(
      "SELECT views FROM article_views WHERE slug = ?"
    ).bind(slug).first();

    return json({
      ok: true,
      slug,
      views: Number(row?.views ?? 0)
    });
  } catch (error) {
    return json({
      error: "Could not update article views",
      details: error.message
    }, 500);
  }
}