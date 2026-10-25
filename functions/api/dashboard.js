
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

    const url =
      `https://api.github.com/repos/${OWNER}/${REPO}/contents/news?ref=${BRANCH}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${env.GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "The-Global-Desk"
      }
    });

    // GitHub-এ news ফোল্ডার না থাকলে খালি তালিকা দেখাবে।
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
      const details = await response.text();

      return json({
        error: "GitHub API request failed",
        status: response.status,
        details: details.slice(0, 500)
      }, 502);
    }

    const files = await response.json();

    if (!Array.isArray(files)) {
      return json({
        error: "Unexpected GitHub API response"
      }, 502);
    }

    const articles = files
      .filter(file =>
        file.type === "file" &&
        file.name.toLowerCase().endsWith(".md")
      )
      .map(file => {
        const title = file.name
          .replace(/\.md$/i, "")
          .replace(/^\d{4}-\d{2}-\d{2}-/, "")
          .replace(/[-_]/g, " ");

        const dateMatch = file.name.match(
          /^(\d{4}-\d{2}-\d{2})/
        );

        return {
          path: file.path,
          sha: file.sha,
          title: title || file.name,
          date: dateMatch ? dateMatch[1] : "",
          category: "",
          published: false,
          status: "Draft"
        };
      })
      .sort((a, b) => b.date.localeCompare(a.date));

    return json({
      ok: true,
      articles,
      total: articles.length,
      published: 0,
      drafts: articles.length
    });

  } catch (error) {
    return json({
      error: "Dashboard request failed",
      details: error.message
    }, 500);
  }
}
