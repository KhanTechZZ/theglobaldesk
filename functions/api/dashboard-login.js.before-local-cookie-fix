import { makeSession, cookieHeaders, sameOrigin, json } from "../_utils/admin.js";

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return json({ error: "Forbidden" }, 403);
  if (!env.ADMIN_PASSWORD || !env.SESSION_SECRET) {
    return json({ error: "Dashboard secrets are not configured" }, 500);
  }

  try {
    const body = await request.json();
    const password = typeof body.password === "string" ? body.password : "";

    if (password.length > 500 || password !== env.ADMIN_PASSWORD) {
      return json({ error: "Incorrect password" }, 401);
    }

    const session = await makeSession(env.SESSION_SECRET);
    return json({ ok: true }, 200, cookieHeaders(session));
  } catch {
    return json({ error: "Invalid request" }, 400);
  }
}
