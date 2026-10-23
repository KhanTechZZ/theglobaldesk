const Parser = require('rss-parser');
const TurndownService = require('turndown');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const parser = new Parser({
  customFields: {
    item: [
      ['media:content', 'mediaContent', { keepArray: true }],
      ['media:thumbnail', 'mediaThumbnail'],
      ['content:encoded', 'contentEncoded']
    ]
  }
});

const turndown = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced'
});
turndown.remove(['script', 'style', 'iframe', 'form']);

const FEEDS = [
  { url: 'https://feeds.bbci.co.uk/news/world/rss.xml', category: 'World', source: 'BBC' },
  { url: 'https://feeds.bbci.co.uk/news/technology/rss.xml', category: 'Tech and AI', source: 'BBC' },
  { url: 'https://feeds.bbci.co.uk/news/science_and_environment/rss.xml', category: 'Science', source: 'BBC' },
  { url: 'https://www.aljazeera.com/xml/rss/all.xml', category: 'World', source: 'Al Jazeera' },
  { url: 'https://www.theguardian.com/world/rss', category: 'World', source: 'The Guardian' },
  { url: 'https://www.theguardian.com/environment/rss', category: 'Environment', source: 'The Guardian' },
  { url: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml', category: 'World', source: 'NYT' },
  { url: 'https://feeds.npr.org/1001/rss.xml', category: 'World', source: 'NPR' }
];

const NEWS_DIR = path.join(__dirname, '..', 'news');
const SEEN_FILE = path.join(__dirname, '..', '.rss-seen.json');
const MAX_ITEMS_PER_FEED = 3;
const MAX_AGE_HOURS = 6;
const MAX_BODY_CHARS = 1200;

let seen = {};
if (fs.existsSync(SEEN_FILE)) {
  try { seen = JSON.parse(fs.readFileSync(SEEN_FILE, 'utf8')); } catch (e) { seen = {}; }
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 60);
}

function extractImage(item) {
  if (item.mediaContent && item.mediaContent.length) {
    for (const m of item.mediaContent) {
      if (m.$ && m.$.url) return m.$.url;
    }
  }
  if (item.enclosure && item.enclosure.url) return item.enclosure.url;
  if (item.mediaThumbnail && item.mediaThumbnail.$ && item.mediaThumbnail.$.url) {
    return item.mediaThumbnail.$.url;
  }
  const html = item.contentEncoded || item.content || item.description || '';
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match ? match[1] : '';
}

function cleanText(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function cleanTitle(t) {
  if (!t) return 'Untitled';
  return t.trim().replace(/\s+/g, ' ').replace(/["\\]/g, '').replace(/[\r\n]/g, ' ');
}

function truncate(text, max) {
  if (text.length <= max) return text;
  const cut = text.substring(0, max);
  const lastDot = cut.lastIndexOf('.');
  if (lastDot > max * 0.6) return cut.substring(0, lastDot + 1);
  return cut + '...';
}

async function processFeed(feed) {
  console.log(`\n📡 ${feed.source} — ${feed.category}`);
  let parsed;
  try {
    parsed = await parser.parseURL(feed.url);
  } catch (e) {
    console.error(`   ❌ Fetch failed: ${e.message}`);
    return 0;
  }

  let added = 0;
  for (const item of parsed.items) {
    if (added >= MAX_ITEMS_PER_FEED) break;
    const link = item.link;
    if (!link || seen[link]) continue;

    const date = new Date(item.pubDate || item.isoDate);
    if (isNaN(date.getTime())) continue;

    const ageHours = (Date.now() - date.getTime()) / 3600000;
    if (ageHours > MAX_AGE_HOURS) continue;

    const title = cleanTitle(item.title);
    const description = truncate(cleanText(item.contentSnippet || item.description), 200);
    const image = extractImage(item);
    const dateStr = date.toISOString().split('T')[0];
    const slug = slugify(title) + '-' + crypto.randomBytes(2).toString('hex');

    const rawBody = item.contentEncoded || item.content || item.description || '';
    let bodyMd = '';
    try { bodyMd = turndown.turndown(rawBody); } catch (e) { bodyMd = cleanText(rawBody); }
    bodyMd = truncate(bodyMd.trim(), MAX_BODY_CHARS);

    const bodyFinal =
      `> **Source:** [${feed.source}](${link})\n` +
      `> This is a summary. [Read the full article →](${link})\n\n` +
      bodyMd +
      `\n\n---\n\n*Originally published by ${feed.source}. Read the full article at [${link}](${link}).*`;

    const frontmatter =
`---
title: "${title.replace(/"/g, '\\"')}"
date: ${date.toISOString()}
category: "${feed.category}"
description: "${description.replace(/"/g, '\\"')}"
source: "${feed.source}"
${image ? `image: "${image}"` : ''}
published: false
---

${bodyFinal}
`;

    const fileName = `${dateStr}-${slug}.md`;
    fs.writeFileSync(path.join(NEWS_DIR, fileName), frontmatter);
    seen[link] = true;
    added++;
    console.log(`   📝 DRAFT: ${fileName}`);
  }

  return added;
}

async function main() {
  console.log('🚀 RSS Automation (Draft mode) — ' + new Date().toISOString());

  let totalAdded = 0;
  for (const feed of FEEDS) {
    totalAdded += await processFeed(feed);
    await new Promise(r => setTimeout(r, 800));
  }

  fs.writeFileSync(SEEN_FILE, JSON.stringify(seen, null, 2));
  console.log(`\n✅ Done. Added ${totalAdded} drafts. Review in Decap CMS: /admin/`);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });