import { clearCookieHeaders, sameOrigin, json } from "../_utils/admin.js";

export async function onRequestPost({ request }) {
  if (!sameOrigin(request)) return json({ error: "Forbidden" }, 403);
  return json({ ok: true }, 200, clearCookieHeaders(request.url));
}

