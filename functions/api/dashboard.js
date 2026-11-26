import { isAdmin, json, sameOrigin } from "../_utils/admin.js";

const OWNER = "KhanTechZZ";
const REPO = "theglobaldesk";
const BRANCH = "main";

const WORKSPACE = "md-zikrullahs-team-6054";
const LEGACY_COUNTER = "first-counter-6054";
const API_BASE = "https://api.counterapi.dev/v2";

function normalizeSlug(value) {
  return String(value || "")
    .split("/")
    .pop()
    .replace(/\.md$/i, "")
    .replace(/^\d{4}-\d{2}-\d{2}-/, "")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

async function readLegacyViews(env) {
  if (!env.COUNTERAPI_TOKEN) return 0;

  try {
    const response = await fetch(
      `${API_BASE}/${WORKSPACE}/${LEGACY_COUNTER}`,
      {
        headers: {
          Authorization: `Bearer ${env.COUNTERAPI_TOKEN}`,
          Accept: "application/json"
        }
      }
    );

    if (!response.ok) return 0;

    const result = await response.json();
    return Number(result.data?.up_count ?? result.up_count ?? 0) || 0;
  } catch {
    return 0;
  }
}

function getField(frontmatter, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = frontmatter.match(
    new RegExp("^\\s*" + escaped + "\\s*:\\s*(.*?)\\s*$", "mi")
  );

  return match ? match[1].replace(/^["']|["']$/g, "").trim() : "";
}

const ARTICLE_CATEGORIES = new Set([
  "World", "Asia", "Explainer", "Editorial", "Perspectives", "Politics",
  "Economy", "Tech and AI", "Science", "Environment", "Geography", "Oceans",
  "Research", "Human Rights", "Z Desk", "Alpha Desk"
]);

function isArticlePath(value) {
  return typeof value === "string" &&
    /^news\/[A-Za-z0-9][A-Za-z0-9._-]*\.md$/.test(value) &&
    !value.includes("..") && value.length <= 180;
}

function toBase64(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

function safeImage(value) {
  const image = String(value || "").trim();
  if (!image) return "";
  if (image.startsWith("/") && !image.startsWith("//")) return image;
  try {
    return new URL(image).protocol === "https:" ? image : null;
  } catch {
    return null;
  }
}

function slugify(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 72);
}

function githubHeaders(env) {
  return {
    Authorization: `Bearer ${env.GITHUB_TOKEN}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "The-Global-Desk"
  };
}

async function getArticleFile(path, env) {
  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  const response = await fetch(
    `https://api.github.com/repos/${OWNER}/${REPO}/contents/${encodedPath}?ref=${BRANCH}`,
    { headers: githubHeaders(env) }
  );
  if (!response.ok) {
    return json({ error: response.status === 404 ? "Article not found" : "Could not read article" }, response.status);
  }
  const file = await response.json();
  const binary = atob(String(file.content || "").replace(/\s/g, ""));
  const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
  return json({ ok: true, path, sha: file.sha, content: new TextDecoder().decode(bytes) });
}

async function ensureDraftStore(env) {
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS cms_drafts (id TEXT PRIMARY KEY, path TEXT NOT NULL, content TEXT NOT NULL, updated_at TEXT NOT NULL)`).run();
}

function draftSummary(row) {
  const frontmatter = (String(row.content).match(/^---\s*\r?\n([\s\S]*?)\r?\n---/) || ["", ""])[1];
  const title = getField(frontmatter, "title") || "Untitled draft";
  return { path: `draft:${row.id}`, sha: "", slug: `draft-${row.id}`, title, date: getField(frontmatter, "date"), category: getField(frontmatter, "category"), published: false, status: "Draft", views: 0 };
}

export async function onRequestGet({ request, env }) {
  try {
    if (!(await isAdmin(request, env))) {
      return json({ error: "Unauthorized" }, 401);
    }

    const query = new URL(request.url).searchParams;
    const requestedDraft = query.get("draft");
    if (requestedDraft) {
      if (!/^[A-Za-z0-9-]{8,80}$/.test(requestedDraft)) return json({ error: "Invalid draft id" }, 400);
      if (!env.DB) return json({ error: "D1 binding DB is missing" }, 500);
      await ensureDraftStore(env);
      const row = await env.DB.prepare("SELECT id, content FROM cms_drafts WHERE id = ?").bind(requestedDraft).first();
      if (!row) return json({ error: "Draft not found" }, 404);
      return json({ ok: true, path: `draft:${row.id}`, sha: "", content: row.content });
    }

    const requestedPath = query.get("path");
    if (requestedPath) {
      if (!isArticlePath(requestedPath)) return json({ error: "Invalid article path" }, 400);
      if (!env.GITHUB_TOKEN) return json({ error: "GITHUB_TOKEN is missing" }, 500);
      return getArticleFile(requestedPath, env);
    }

    if (!env.DB) {
      return json({ error: "D1 binding DB is missing" }, 500);
    }
    await ensureDraftStore(env);
    if (!env.GITHUB_TOKEN) return json({ error: "GITHUB_TOKEN is missing" }, 500);

    const response = await fetch(
      `https://api.github.com/repos/${OWNER}/${REPO}/contents/news?ref=${BRANCH}`,
      {
        headers: {
          Authorization: `Bearer ${env.GITHUB_TOKEN}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          "User-Agent": "The-Global-Desk"
        }
      }
    );

    if (response.status === 404) {
      return json({
        ok: true,
        articles: [],
        total: 0,
        published: 0,
        drafts: 0,
        views: await readLegacyViews(env)
      });
    }

    if (!response.ok) {
      return json({
        error: "GitHub API request failed",
        status: response.status,
        details: (await response.text()).slice(0, 500)
      }, 502);
    }

    const files = await response.json();

    if (!Array.isArray(files)) {
      return json({ error: "Unexpected GitHub API response" }, 502);
    }

    const markdownFiles = files.filter(file =>
      file.type === "file" && file.name.toLowerCase().endsWith(".md")
    );

    const articles = await Promise.all(markdownFiles.map(async file => {
      const slug = normalizeSlug(file.path);
      const fallbackTitle = file.name
        .replace(/\.md$/i, "")
        .replace(/^\d{4}-\d{2}-\d{2}-/, "")
        .replace(/[-_]/g, " ");
      const dateMatch = file.name.match(/^\d{4}-\d{2}-\d{2}/);

      try {
        const detailResponse = await fetch(file.url, {
          headers: {
            Authorization: `Bearer ${env.GITHUB_TOKEN}`,
            Accept: "application/vnd.github.raw+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "The-Global-Desk"
          }
        });

        if (!detailResponse.ok) {
          throw new Error("Could not read article");
        }

        const raw = await detailResponse.text();
        const frontmatterMatch = raw.match(
          /^---\s*\r?\n([\s\S]*?)\r?\n---/
        );
        const frontmatter = frontmatterMatch ? frontmatterMatch[1] : "";

        const title = getField(frontmatter, "title") || fallbackTitle;
        const publishedValue = getField(frontmatter, "published").toLowerCase();
        const published = ["true", "yes", "1"].includes(publishedValue);
        const date = getField(frontmatter, "date") || (dateMatch ? dateMatch[0] : "");

        return {
          path: file.path,
          sha: file.sha,
          slug,
          title,
          date,
          category: getField(frontmatter, "category"),
          published,
          status: published ? "Published" : "Draft"
        };
      } catch {
        return {
          path: file.path,
          sha: file.sha,
          slug,
          title: fallbackTitle,
          date: dateMatch ? dateMatch[0] : "",
          category: "",
          published: false,
          status: "Unknown"
        };
      }
    }));

    articles.sort((a, b) => b.date.localeCompare(a.date));

    const published = articles.filter(a => a.published).length;
    const drafts = articles.filter(a => a.status === "Draft").length;

    for (const article of articles) {
      if (!article.slug) continue;

      await env.DB.prepare(`
        INSERT INTO article_views (slug, views)
        VALUES (?, 0)
        ON CONFLICT(slug) DO NOTHING
      `).bind(article.slug).run();
    }

    const result = await env.DB.prepare(
      "SELECT slug, views FROM article_views"
    ).all();

    const viewsBySlug = new Map(
      (result.results || []).map(row => [
        row.slug,
        Number(row.views) || 0
      ])
    );

    const articlesWithViews = articles.map(article => ({
      ...article,
      views: viewsBySlug.get(article.slug) || 0
    }));

    const draftsResult = await env.DB.prepare("SELECT id, content FROM cms_drafts ORDER BY updated_at DESC").all();
    articlesWithViews.push(...(draftsResult.results || []).map(draftSummary));

    const articleViews = articlesWithViews.reduce(
      (sum, article) => sum + article.views,
      0
    );

    const legacyViews = await readLegacyViews(env);

    return json({
      ok: true,
      articles: articlesWithViews,
      total: articlesWithViews.length,
      published,
      drafts: drafts + (draftsResult.results || []).length,
      views: legacyViews + articleViews
    });
  } catch (error) {
    return json({
      error: "Dashboard request failed",
      details: error.message
    }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  if (!(await isAdmin(request, env))) return json({ error: "Unauthorized" }, 401);
  if (!sameOrigin(request)) return json({ error: "Request origin could not be verified" }, 403);
  if (!env.DB) return json({ error: "D1 binding DB is missing" }, 500);

  try {
    const input = await request.json();
    const title = String(input.title || "").trim();
    const category = String(input.category || "").trim();
    const date = String(input.date || "").trim();
    const description = String(input.description || "").trim();
    const image = safeImage(input.image);
    const author = String(input.author || "The Global Desk").trim();
    const body = String(input.body || "").trim();
    const published = input.published === true;
    if (!title || title.length > 180 || !ARTICLE_CATEGORIES.has(category) || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !description || description.length > 360 || image === null || author.length > 100 || body.length < 20 || body.length > 100000) {
      return json({ error: "Please check the title, category, date, summary, image URL, author, and article text." }, 400);
    }

    const existingPath = input.path ? String(input.path) : "";
    if (existingPath && !isArticlePath(existingPath) && !/^draft:[A-Za-z0-9-]{8,80}$/.test(existingPath)) return json({ error: "Invalid article path" }, 400);
    const slug = slugify(title);
    if (!slug) return json({ error: "The title needs at least one English letter or number." }, 400);
    const metadata = [
      `title: ${JSON.stringify(title)}`,
      `date: ${date}`,
      `category: ${JSON.stringify(category)}`,
      `description: ${JSON.stringify(description)}`,
      `image: ${JSON.stringify(image)}`,
      `author: ${JSON.stringify(author)}`,
      `published: ${published ? "true" : "false"}`,
      "layout: article.njk"
    ].join("\n");
    const content = `---\n${metadata}\n---\n\n${body}\n`;
    await ensureDraftStore(env);
    const isExistingDraft = existingPath.startsWith("draft:");
    if (isExistingDraft && !/^draft:[A-Za-z0-9-]{8,80}$/.test(existingPath)) return json({ error: "Invalid draft id" }, 400);

    if (!published) {
      const id = isExistingDraft ? existingPath.slice(6) : crypto.randomUUID();
      await env.DB.prepare(`INSERT INTO cms_drafts (id, path, content, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET path = excluded.path, content = excluded.content, updated_at = excluded.updated_at`).bind(id, `news/${date}-${slug}.md`, content, new Date().toISOString()).run();
      if (existingPath && !isExistingDraft) {
        if (!env.GITHUB_TOKEN) return json({ error: "GITHUB_TOKEN is missing; the draft was saved, but the live article could not be unpublished." }, 500);
        if (!input.sha) return json({ error: "Article version is missing. Draft was saved, but the live article could not be unpublished." }, 409);
        const oldPath = existingPath.split("/").map(encodeURIComponent).join("/");
        const remove = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/contents/${oldPath}`, { method: "DELETE", headers: { ...githubHeaders(env), "Content-Type": "application/json" }, body: JSON.stringify({ message: `Unpublish: ${title}`, sha: String(input.sha), branch: BRANCH }) });
        if (!remove.ok) return json({ error: "Draft saved, but GitHub could not unpublish the existing article." }, 502);
      }
      return json({ ok: true, path: `draft:${id}`, sha: "", published: false, message: "Draft saved privately in the CMS." });
    }

    if (!env.GITHUB_TOKEN) return json({ error: "GITHUB_TOKEN is missing" }, 500);
    const publishingDraftId = isExistingDraft ? existingPath.slice(6) : "";
    const path = isExistingDraft ? `news/${date}-${slug}.md` : (existingPath || `news/${date}-${slug}.md`);
    const payload = { message: `Publish: ${title}`, content: toBase64(content), branch: BRANCH };
    if (existingPath && !isExistingDraft) {
      if (!input.sha) return json({ error: "Article version is missing. Reload it before saving." }, 409);
      payload.sha = String(input.sha);
    }

    const encodedPath = path.split("/").map(encodeURIComponent).join("/");
    const response = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/contents/${encodedPath}`, {
      method: "PUT",
      headers: { ...githubHeaders(env), "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      const details = await response.json().catch(() => ({}));
      const status = response.status === 409 || response.status === 422 ? 409 : response.status === 403 ? 403 : 502;
      return json({ error: status === 403 ? "GitHub token needs repository Contents: write permission." : status === 409 ? "Could not save because the file changed or already exists. Reload and try again." : "GitHub could not save this article.", details: details.message || "" }, status);
    }
    const saved = await response.json();
    if (publishingDraftId) await env.DB.prepare("DELETE FROM cms_drafts WHERE id = ?").bind(publishingDraftId).run();
    return json({ ok: true, path, sha: saved.content?.sha || "", published, message: "Article saved and queued for publishing." });
  } catch (error) {
    return json({ error: "Could not save article", details: error.message }, 500);
  }
}
