import { isAdmin, json } from "../_utils/admin.js";

const OWNER = "KhanTechZZ";
const REPO = "theglobaldesk";
const BRANCH = "main";

export async function onRequestGet({ request, env }) {
  try {
    if (!(await isAdmin(request, env))) {
      return json({ error: "Unauthorized" }, 401);
    }

    if (!env.GITHUB_TOKEN) {
      return json({ error: "GITHUB_TOKEN is missing" }, 500);
    }

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
        drafts: 0
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
      file.type === "file" &&
      file.name.toLowerCase().endsWith(".md")
    );

    const articles = await Promise.all(
      markdownFiles.map(async file => {
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

          const frontmatter = frontmatterMatch
            ? frontmatterMatch[1]
            : "";

          function getField(name) {
            const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            const match = frontmatter.match(
              new RegExp("^\\s*" + escaped + "\\s*:\\s*(.*?)\\s*$", "mi")
            );

            if (!match) return "";

            return match[1]
              .replace(/^["']|["']$/g, "")
              .trim();
          }

          const title = getField("title") || fallbackTitle;
          const publishedValue = getField("published").toLowerCase();
          const published = ["true", "yes", "1"].includes(publishedValue);

          const date = getField("date") || (dateMatch ? dateMatch[0] : "");

          return {
            path: file.path,
            sha: file.sha,
            title,
            date,
            category: getField("category"),
            published,
            status: published ? "Published" : "Draft"
          };
        } catch {
          return {
            path: file.path,
            sha: file.sha,
            title: fallbackTitle,
            date: dateMatch ? dateMatch[0] : "",
            category: "",
            published: false,
            status: "Unknown"
          };
        }
      })
    );

    articles.sort((a, b) => b.date.localeCompare(a.date));

    const published = articles.filter(a => a.published).length;
    const drafts = articles.filter(a => a.status === "Draft").length;

    let views = null;
    try {
      const viewsResponse = await fetch(
        "https://api.counterapi.dev/v2/md-zikrullahs-team-6054/first-counter-6054",
        {
          headers: {
            Authorization: `Bearer ${env.COUNTERAPI_TOKEN}`,
            Accept: "application/json"
          }
        }
      );
      if (viewsResponse.ok) {
        const viewsData = await viewsResponse.json();
        views = viewsData.data?.up_count ?? viewsData.up_count ?? null;
      }
    } catch {
      views = null;
    }
    return json({
      ok: true,
      articles,
      total: articles.length,
      published,
      drafts,
      views
    });
  } catch (error) {
    return json({
      error: "Dashboard request failed",
      details: error.message
    }, 500);
  }
}
