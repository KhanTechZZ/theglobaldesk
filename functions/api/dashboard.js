
export async function onRequestGet({ request, env }) {
  if (!(await isAdmin(request, env))) {
    return json({ error: "Unauthorized" }, 401);
  }
  if (!env.GITHUB_TOKEN) {
    return json({ error: "GITHUB_TOKEN is missing" }, 500);
  }

  const res = await github(
    `/repos/${OWNER}/${REPO}/git/trees/${BRANCH}?recursive=1`,
    env
  );

  if (!res.ok) {
    return json({ error: "Could not load articles from GitHub" }, 502);
  }

  const tree = await res.json();
  if (!Array.isArray(tree.tree)) {
    return json({ error: "Invalid GitHub tree response" }, 502);
  }

  const files = tree.tree.filter(f =>
    f.type === "blob" &&
    /^news\/[A-Za-z0-9._-]+\.md$/.test(f.path)
  );

  const articles = [];

  for (const file of files) {
    // Read metadata from the Git tree only; don't request every article.
    articles.push({
      path: file.path,
      title: file.path.split("/").pop().replace(/\.md$/i, ""),
      date: "",
      published: false,
      status: "Unknown",
      sha: file.sha
    });
  }

  return json({
    articles,
    drafts: 0,
    published: 0,
    note: "Article metadata needs a single-request content endpoint."
  });
}
