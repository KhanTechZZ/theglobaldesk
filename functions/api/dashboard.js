import { isAdmin, sameOrigin, json } from "../_utils/admin.js";

const OWNER = "KhanTechZZ";
const REPO = "theglobaldesk";
const BRANCH = "main";

async function github(path, env, method = "GET", body) {
  return fetch(`https://api.github.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
      "User-Agent": "TheGlobalDesk-Admin"
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
}

function parseArticle(content, filename) {
  const text = atob(content.replace(/\n/g, ""));
  const bytes = Uint8Array.from(text, c => c.charCodeAt(0));
  const md = new TextDecoder().decode(bytes);
  const fm = md.match(/^---\s*\r?\n([\s\S]*?)\r?\n---/);

  const get = key => {
    const m = fm?.[1].match(new RegExp("^" + key + "\\s*:\\s*(.*)$", "mi"));
    return m ? m[1].trim().replace(/^['"]|['"]$/g, "") : "";
  };

  const published = get("published").toLowerCase() === "true";
  return {
    path: `news/${filename}`,
    title: get("title") || filename.replace(/\.md$/i, ""),
    date: get("date"),
    published,
    status: published ? "Published" : "Draft"
  };
}

export async function onRequestGet({ request, env }) {
  if (!(await isAdmin(request, env))) return json({ error: "Unauthorized" }, 401);
  if (!env.GITHUB_TOKEN) return json({ error: "GITHUB_TOKEN is missing" }, 500);

  const res = await github(
    `/repos/${OWNER}/${REPO}/contents/news?ref=${BRANCH}`, env
  );
  if (!res.ok) return json({ error: "Could not load articles from GitHub" }, 502);

  const files = await res.json();
  if (!Array.isArray(files)) return json({ error: "Unexpected repository response" }, 502);

  const markdown = files.filter(f => f.type === "file" && f.name.endsWith(".md"));
  const articles = [];

  for (const file of markdown) {
    const detail = await github(
      `/repos/${OWNER}/${REPO}/contents/${encodeURIComponent("news/" + file.name)}?ref=${BRANCH}`,
      env
    );
    if (!detail.ok) continue;
    const data = await detail.json();
    if (data.content) articles.push({ ...parseArticle(data.content, file.name), sha: data.sha });
  }

  articles.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  return json({
    articles,
    drafts: articles.filter(a => !a.published).length,
    published: articles.filter(a => a.published).length
  });
}

export async function onRequestDelete({ request, env }) {
  if (!sameOrigin(request)) return json({ error: "Forbidden" }, 403);
  if (!(await isAdmin(request, env))) return json({ error: "Unauthorized" }, 401);
  if (!env.GITHUB_TOKEN) return json({ error: "GITHUB_TOKEN is missing" }, 500);

  try {
    const body = await request.json();
    const paths = body.paths;

    if (!Array.isArray(paths) || paths.length < 1 || paths.length > 20) {
      return json({ error: "Select 1–20 articles" }, 400);
    }

    if (paths.some(p =>
      typeof p !== "string" ||
      !/^news\/[A-Za-z0-9._-]+\.md$/.test(p) ||
      p.includes("..")
    )) return json({ error: "Invalid article path" }, 400);

    const unique = [...new Set(paths)];
    if (unique.length !== paths.length) return json({ error: "Duplicate paths" }, 400);

    const results = [];
    for (const path of unique) {
      const encodedPath = path.split("/").map(encodeURIComponent).join("/");
      const current = await github(
        `/repos/${OWNER}/${REPO}/contents/${encodedPath}?ref=${BRANCH}`, env
      );
      if (!current.ok) {
        results.push({ path, ok: false });
        continue;
      }

      const file = await current.json();
      const deleted = await github(
        `/repos/${OWNER}/${REPO}/contents/${encodedPath}`,
        env,
        "DELETE",
        { message: `Delete article ${path}`, sha: file.sha, branch: BRANCH }
      );
      results.push({ path, ok: deleted.ok });
    }

    return json({
      results,
      deleted: results.filter(r => r.ok).length,
      failed: results.filter(r => !r.ok).length
    });
  } catch {
    return json({ error: "Invalid delete request" }, 400);
  }
}
