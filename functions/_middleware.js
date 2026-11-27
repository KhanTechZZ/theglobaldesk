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

  // Block direct access to private CMS assets.
  if (path.toLowerCase().startsWith("/_private-cms/")) {
    return notFound();
  }

  // Show branded 404 page for old public admin paths.
  if (path.toLowerCase().startsWith("/admin")) {
    const pageUrl = new URL("/admin/closed.html", url.origin);
    const pageResponse = await env.ASSETS.fetch(
      new Request(pageUrl.toString(), { method: "GET" })
    );

    if (!pageResponse.ok) return notFound();

    const headers = new Headers(pageResponse.headers);
    headers.set("Content-Type", "text/html; charset=utf-8");
    headers.set("Cache-Control", "no-store");

    return new Response(pageResponse.body, {
      status: 404,
      statusText: "Not Found",
      headers
    });
  }

  const isLogin =
    path === PRIVATE_BASE || path === `${PRIVATE_BASE}/`;

  const isLegacyCms = path === `${PRIVATE_BASE}/cms.html` || path === `${PRIVATE_BASE}/config.yml`;

  // Allow unrelated routes to continue normally.
  if (isLegacyCms) return notFound();
  if (!isLogin) {
    return context.next();
  }

  // Private admin pages are only served for GET and HEAD.
  if (request.method !== "GET" && request.method !== "HEAD") {
    return notFound();
  }

  const target = new URL(request.url);
  target.pathname = "/admin/";

  const assetResponse = await env.ASSETS.fetch(new Request(target.toString(), request));

  return assetResponse;
}
