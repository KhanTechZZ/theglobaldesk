const enc = new TextEncoder();

function b64(bytes) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function unb64(s) {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  s += "=".repeat((4 - s.length % 4) % 4);
  return Uint8Array.from(atob(s), c => c.charCodeAt(0));
}

async function sign(value, secret) {
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  return b64(new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(value))));
}

export async function makeSession(secret) {
  const payload = b64(enc.encode(JSON.stringify({
    exp: Date.now() + 8 * 60 * 60 * 1000
  })));
  return payload + "." + await sign(payload, secret);
}

export async function isAdmin(request, env) {
  if (!env.SESSION_SECRET) return false;
  const cookie = request.headers.get("Cookie") || "";


const match = cookie.match(/(?:^|;\s*)tg_admin=([^;]+)/);


if (!match) return false;
  const [payload, signature] = match[1].split(".");
  if (!payload || !signature) return false;

  const expected = await sign(payload, env.SESSION_SECRET);

  if (signature !== expected) return false;

  try {
    const data = JSON.parse(new TextDecoder().decode(unb64(payload)));
    return data.exp > Date.now();
  } catch {
    return false;
  }
}

export function cookieHeaders(value, requestUrl) {
  const hostname = requestUrl ? new URL(requestUrl).hostname : "";
  const secure = ["localhost", "127.0.0.1", "::1"].includes(hostname) ? "" : " Secure;";
  return {
    "Set-Cookie": `tg_admin=${value}; HttpOnly;${secure} SameSite=Strict; Path=/; Max-Age=28800`,
    "Cache-Control": "no-store",
    "Content-Type": "application/json"
  };
}

export function clearCookieHeaders(requestUrl) {
  const hostname = requestUrl ? new URL(requestUrl).hostname : "";
  const secure = ["localhost", "127.0.0.1", "::1"].includes(hostname) ? "" : " Secure;";
  return {
    "Set-Cookie": `tg_admin=; HttpOnly;${secure} SameSite=Strict; Path=/; Max-Age=0`,
    "Cache-Control": "no-store",
    "Content-Type": "application/json"
  };
}

export function sameOrigin(request) {
  const origin = request.headers.get("Origin");
  return !!origin && origin === new URL(request.url).origin;
}

export function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...extra }
  });
}

