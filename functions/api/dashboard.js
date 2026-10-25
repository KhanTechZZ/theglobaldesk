
import { isAdmin, json } from "../_utils/admin.js";

const OWNER = "KhanTechZZ";
const REPO = "theglobaldesk";
const BRANCH = "main";

async function getArticles(env) {
  const query = `
    query {
      repository(owner: "${OWNER}", name: "${REPO}") {
        object(expression: "${BRANCH}:news") {
          ... on Tree {
            entries {
              name
              type
              object {
                ... on Blob {
                  text
                  oid
                }
              }
            }
          }
        }
      }
    }
  `;

  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      "Content-Type": "application/json",
      Accept: "application/vnd.github+json"
    },
    body: JSON.stringify({ query })
  });

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status}`);
  }

  const result = await response.json();

  if (result.errors?.length) {
    throw new Error(result.errors[0].message);
  }

  const entries =
    result.data?.repository?.object?.entries || [];

  return entries
    .filter(entry =>
      entry.type === "blob" &&
      entry.name.endsWith(".md") &&
      typeof entry.object?.text === "string"
    )
    .map(entry => {
      const content = entry.object.text;
      const match = content.match(
        /^---\s*\r?\n([\s\S]*?)\r?\n---(?:\s*\r?\n|$)/
      );

      const frontmatter = match ? match[1] : "";

      function field(name) {
        const regex = new RegExp(
          "^" + name + ":\\s*(.*)$",
          "m"
        );
        const found = frontmatter.match(regex);

        return found
          ? found[1].trim().replace(/^(['"])(.*)\1$/, "$2")
          : "";
      }

      const published = /^published:\s*true\s*(?:#.*)?$/mi
        .test(frontmatter);

      return {
        path: `news/${entry.name}`,
        sha: entry.object.oid,
        title: field("title") || entry.name.replace(/\.md$/i, ""),
        date: field("date"),
        category: field("category"),
        published,
        status: published ? "Published" : "Draft"
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

export async function onRequestGet({ request, env }) {
  if (!(await isAdmin(request, env))) {
    return json({ error: "Unauthorized" }, 401);
  }

  if (!env.GITHUB_TOKEN) {
    return json({ error: "GITHUB_TOKEN is missing" }, 500);
  }

  try {
    const articles = await getArticles(env);

    return json({
      ok: true,
      articles,
      total: articles.length,
      published: articles.filter(a => a.published).length,
      drafts: articles.filter(a => !a.published).length
    });
  } catch (error) {
    return json({
      error: "Could not load news from GitHub",
      details: error.message
    }, 502);
  }
}
