import { isAdmin } from "./_utils/admin.js";

const PRIVATE_BASE = "/desk-9c41b7e2";

function notFound() {
  return new Response("Not Found", {
    status: 404,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff"
    }
  });
}

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;

  // Hide the original public admin paths.
  if (path.toLowerCase().startsWith("/admin")) {
    return notFound();
  }

  const isLogin =
    path === PRIVATE_BASE || path === `${PRIVATE_BASE}/`;

  const isCms = path === `${PRIVATE_BASE}/cms.html`;
  const isConfig = path === `${PRIVATE_BASE}/config.yml`;

  // Allow unrelated routes to continue normally.
  if (!isLogin && !isCms && !isConfig) {
    return context.next();
  }

  // Private admin pages are only served for GET and HEAD.
  if (request.method !== "GET" && request.method !== "HEAD") {
    return notFound();
  }

  // Login page is public; CMS and its config require a valid session.
  if (!isLogin && !(await isAdmin(request, env))) {
    return notFound();
  }

  const target = new URL(request.url);

  if (isLogin) {
    target.pathname = "/admin/";
  } else if (isCms) {
    target.pathname = "/_private-cms/editor.txt";
  } else {
    target.pathname = "/admin/config.yml";
  }

  const assetResponse = await env.ASSETS.fetch(new Request(target.toString(), request));

  if (isCms) {
    const headers = new Headers(assetResponse.headers);
    headers.set("Content-Type", "text/html; charset=utf-8");
    headers.set("Cache-Control", "no-store");

    return new Response(assetResponse.body, {
      status: assetResponse.status,
      statusText: assetResponse.statusText,
      headers
    });
  }

  return assetResponse;
}



