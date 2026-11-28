import { makeSession, cookieHeaders, sameOrigin, json } from "../_utils/admin.js";

const LIMIT = 8;
const WINDOW_MS = 15 * 60 * 1000;

async function clientKey(request, secret) {
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const data = new TextEncoder().encode(`${secret}:${ip}`);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", data));
  return Array.from(digest, byte => byte.toString(16).padStart(2, "0")).join("");
}

async function ensureLoginLimits(env) {
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS cms_login_limits (client_key TEXT PRIMARY KEY, window_started INTEGER NOT NULL, failures INTEGER NOT NULL DEFAULT 0, blocked_until INTEGER NOT NULL DEFAULT 0)`).run();
}

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return json({ error: "Forbidden" }, 403);
  if (!env.ADMIN_PASSWORD || !env.SESSION_SECRET) {
    return json({ error: "Dashboard secrets are not configured" }, 500);
  }
  if (!env.DB) return json({ error: "Dashboard database is not configured" }, 503);

  try {
    await ensureLoginLimits(env);
    const now = Date.now();
    await env.DB.prepare("DELETE FROM cms_login_limits WHERE window_started < ?").bind(now - 24 * WINDOW_MS).run();
    const key = await clientKey(request, env.SESSION_SECRET);
    const record = await env.DB.prepare("SELECT window_started, failures, blocked_until FROM cms_login_limits WHERE client_key = ?").bind(key).first();
    if (record?.blocked_until > now) return json({ error: "Too many attempts. Please try again in 15 minutes." }, 429);
    if (!record || record.window_started <= now - WINDOW_MS) {
      await env.DB.prepare(`INSERT INTO cms_login_limits (client_key, window_started, failures, blocked_until) VALUES (?, ?, 0, 0) ON CONFLICT(client_key) DO UPDATE SET window_started = excluded.window_started, failures = 0, blocked_until = 0`).bind(key, now).run();
    }

    const body = await request.json();
    const password = typeof body.password === "string" ? body.password : "";

    if (password.length > 500 || password !== env.ADMIN_PASSWORD) {
      const current = record && record.window_started > now - WINDOW_MS ? Number(record.failures) : 0;
      const failures = current + 1;
      const blockedUntil = failures >= LIMIT ? now + WINDOW_MS : 0;
      await env.DB.prepare(`INSERT INTO cms_login_limits (client_key, window_started, failures, blocked_until) VALUES (?, ?, ?, ?) ON CONFLICT(client_key) DO UPDATE SET window_started = excluded.window_started, failures = excluded.failures, blocked_until = excluded.blocked_until`).bind(key, current ? record.window_started : now, failures, blockedUntil).run();
      return json({ error: "Incorrect password" }, 401);
    }

    await env.DB.prepare("DELETE FROM cms_login_limits WHERE client_key = ?").bind(key).run();
    const session = await makeSession(env.SESSION_SECRET);
    return json({ ok: true }, 200, cookieHeaders(session, request.url));
  } catch {
    return json({ error: "Sign-in is temporarily unavailable. Please try again." }, 503);
  }
}
