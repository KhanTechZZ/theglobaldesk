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

function articleCounter(slug) {
  const clean = normalizeSlug(slug);
  return clean ? `article-${clean}` : "";
}

async function requestCounter(env, name, increment = false) {
  if (!env.COUNTERAPI_TOKEN) {
    return Response.json(
      { error: "COUNTERAPI_TOKEN is missing" },
      { status: 500 }
    );
  }

  const response = await fetch(
    `${API_BASE}/${WORKSPACE}/${encodeURIComponent(name)}${increment ? "/up" : ""}`,
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
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const slug = url.searchParams.get("slug");

  if (!slug) {
    return requestCounter(env, LEGACY_COUNTER);
  }

  const name = articleCounter(slug);
  if (!name) {
    return Response.json({ error: "Invalid article slug" }, { status: 400 });
  }

  return requestCounter(env, name);
}

export async function onRequestPost({ request, env }) {
  let body;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const name = articleCounter(body.slug);

  if (!name) {
    return Response.json({ error: "Invalid article slug" }, { status: 400 });
  }

  return requestCounter(env, name, true);
}
