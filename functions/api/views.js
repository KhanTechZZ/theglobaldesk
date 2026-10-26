const WORKSPACE = "md-zikrullahs-team-6054";
const COUNTER = "first-counter-6054";
const API_BASE = "https://api.counterapi.dev/v2";

async function counterRequest(env, increment = false) {
  if (!env.COUNTERAPI_TOKEN) {
    return Response.json({ error: "COUNTERAPI_TOKEN is missing" }, { status: 500 });
  }

  const action = increment ? "/up" : "";
  const response = await fetch(
    `${API_BASE}/${WORKSPACE}/${COUNTER}${action}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${env.COUNTERAPI_TOKEN}`,
        Accept: "application/json"
      }
    }
  );

  const body = await response.text();

  return new Response(body, {
    status: response.status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }
  });
}

export async function onRequestGet({ env }) {
  return counterRequest(env, false);
}

export async function onRequestPost({ env }) {
  return counterRequest(env, true);
}
