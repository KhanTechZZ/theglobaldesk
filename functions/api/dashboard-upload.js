import { isAdmin, json, sameOrigin } from "../_utils/admin.js";

const OWNER = "KhanTechZZ";
const REPO = "theglobaldesk";
const MAX_BYTES = 8 * 1024 * 1024;

function bytesToBase64(bytes) {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

export async function onRequestPost({ request, env }) {
  if (!(await isAdmin(request, env))) return json({ error: "Unauthorized" }, 401);
  if (!sameOrigin(request)) return json({ error: "Request origin could not be verified" }, 403);
  if (!env.GITHUB_TOKEN) return json({ error: "Image storage is not configured" }, 500);

  try {
    const form = await request.formData();
    const file = form.get("image");
    if (!(file instanceof File) || !file.size || file.size > MAX_BYTES) {
      return json({ error: "Choose an image smaller than 8 MB." }, 400);
    }
    const types = { "image/webp": "webp", "image/jpeg": "jpg", "image/png": "png" };
    const extension = types[file.type];
    if (!extension) return json({ error: "Use a WebP, JPEG or PNG image." }, 415);

    const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
    const name = `${date}-${crypto.randomUUID().slice(0, 8)}.${extension}`;
    const path = `images/news/${name}`;
    const bytes = new Uint8Array(await file.arrayBuffer());
    const response = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${env.GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "The-Global-Desk",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ message: `Upload article image: ${name}`, content: bytesToBase64(bytes), branch: "main" })
    });
    if (!response.ok) return json({ error: "Could not save the image to the newsroom library." }, 502);
    return json({ ok: true, path: `/${path}` });
  } catch {
    return json({ error: "Image upload failed. Please try again." }, 500);
  }
}
