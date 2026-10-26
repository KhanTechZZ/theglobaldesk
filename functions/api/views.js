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

async function apiRequest(env, name, action = "") {
  return fetch(
    `${API_BASE}/${WORKSPACE}/${encodeURIComponent(name)}${action ? `/${action}` : ""}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${env.COUNTERAPI_TOKEN}`,
        Accept: "application/json"
      }
    }
  );
}

async function requestCounter(env, name, increment = false) {
  if (!env.COUNTERAPI_TOKEN) {
    return Response.json(
      { error: "COUNTERAPI_TOKEN is missing" },
      { status: 500 }
    );
  }

  try {
    let response = await apiRequest(env, name, increment ? "up" : "");

    if (increment && response.status === 404) {
      // Initialize a missing counter, then increment it.
      const resetResponse = await apiRequest(env, name, "reset");

      if (!resetResponse.ok) {
        const details = await resetResponse.text();
        return Response.json(
          {
            error: "Could not initialize article counter",
            counter: name,
            details
          },
          { status: resetResponse.status }
        );
      }

      response = await apiRequest(env, name, "up");
    }

    const body = await response.text();

    return new Response(body, {
      status: response.status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    return Response.json(
      { error: "CounterAPI request failed", details: String(error) },
      { status: 502 }
    );
  }
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const slug = url.searchParams.get("slug");

  if (!slug) {
    return requestCounter(env, LEGACY_COUNTER);
  }

  const name = articleCounter(slug);

  if (!name) {
    return Response.json(
      { error: "Invalid article slug" },
      { status: 400 }
    );
  }

  return requestCounter(env, name);
}

export async function onRequestPost({ request, env }) {
  let body;

  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const name = articleCounter(body.slug);

  if (!name) {
    return Response.json(
      { error: "Invalid article slug" },
      { status: 400 }
    );
  }

  return requestCounter(env, name, true);
}
