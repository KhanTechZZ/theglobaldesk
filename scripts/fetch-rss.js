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

const turndown = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' });
turndown.remove(['script', 'style', 'iframe', 'form']);

// ================= REGULAR NEWS FEEDS =================
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

// ================= BREAKING NEWS FEEDS =================
const BREAKING_FEEDS = [
  { url: 'https://feeds.bbci.co.uk/news/rss.xml', source: 'BBC Breaking' },
  { url: 'https://www.aljazeera.com/xml/rss/all.xml', source: 'Al Jazeera Breaking' }
];

const NEWS_DIR = path.join(__dirname, '..', 'news');
const BREAKING_DIR = path.join(__dirname, '..', 'breaking'); // ✅ ব্রেকিং নিউজের ফোল্ডার
const SEEN_FILE = path.join(__dirname, '..', '.rss-seen.json');

const MAX_ITEMS_PER_FEED = 3;
const MAX_AGE_HOURS = 6;
const MAX_BODY_CHARS = 1200;
const DRAFT_EXPIRY_DAYS = 7;

// ফোল্ডার না থাকলে তৈরি করা
if (!fs.existsSync(NEWS_DIR)) fs.mkdirSync(NEWS_DIR, { recursive: true });
if (!fs.existsSync(BREAKING_DIR)) fs.mkdirSync(BREAKING_DIR, { recursive: true });

let seen = {};
if (fs.existsSync(SEEN_FILE)) {
  try { seen = JSON.parse(fs.readFileSync(SEEN_FILE, 'utf8')); } catch (e) { seen = {}; }
}

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim()
    .replace(/\s+/g, '-').replace(/-+/g, '-').substring(0, 60);
}

function extractImage(item) {
  if (item.mediaContent && item.mediaContent.length) {
    for (const m of item.mediaContent) { if (m.$ && m.$.url) return m.$.url; }
  }
  if (item.enclosure && item.enclosure.url) return item.enclosure.url;
  if (item.mediaThumbnail && item.mediaThumbnail.$ && item.mediaThumbnail.$.url) return item.mediaThumbnail.$.url;
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

function cleanupOldDrafts() {
  console.log('\n🧹 Cleaning up old drafts (older than ' + DRAFT_EXPIRY_DAYS + ' days)...');
  if (!fs.existsSync(NEWS_DIR)) return 0;

  const files = fs.readdirSync(NEWS_DIR).filter(f => f.endsWith('.md'));
  let deleted = 0;
  const now = Date.now();
  const maxAge = DRAFT_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

  for (const file of files) {
    const filePath = path.join(NEWS_DIR, file);
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const isDraft = /^published:\s*false\s*$/m.test(content);
      if (!isDraft) continue;

      const importedMatch = content.match(/^imported_at:\s*"?([^"\n]+)"?\s*$/m);
      const dateMatch = content.match(/^date:\s*"?([^"\n]+)"?\s*$/m);
      const dateStr = importedMatch ? importedMatch[1] : (dateMatch ? dateMatch[1] : null);
      if (!dateStr) continue;

      const fileAge = now - new Date(dateStr).getTime();
      if (fileAge > maxAge) {
        fs.unlinkSync(filePath);
        deleted++;
        console.log(`   🗑️  Deleted: ${file}`);
      }
    } catch (e) {}
  }
  console.log(`   ✅ Deleted ${deleted} old drafts.`);
  return deleted;
}

// ================= REGULAR NEWS PROCESSOR =================
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

    const importedAt = new Date().toISOString();

    const frontmatter =
`---
title: "${title.replace(/"/g, '\\"')}"
date: ${date.toISOString()}
imported_at: ${importedAt}
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

// ================= BREAKING NEWS PROCESSOR =================
async function processBreakingFeed(feed) {
  console.log(`\n🚨 BREAKING: ${feed.source}`);
  let parsed;
  try {
    parsed = await parser.parseURL(feed.url);
  } catch (e) {
    console.error(`   ❌ Fetch failed: ${e.message}`);
    return 0;
  }

  let added = 0;
  // ব্রেকিং নিউজের ক্ষেত্রে শুধু একদম টপকের ১টি নিউজ নিব
  const item = parsed.items[0]; 
  if (!item) return 0;

  const link = item.link;
  if (!link || seen[link]) return 0;

  const title = cleanTitle(item.title);
  const slug = slugify(title) + '-' + crypto.randomBytes(2).toString('hex');

  // ব্রেকিং নিউজ ৪ ঘণ্টা পর অটোমেটিক এক্সপায়ার হবে
  const now = new Date();
  const expiresAt = new Date(now.getTime() + (4 * 60 * 60 * 1000)); 

  const frontmatter =
`---
title: "${title.replace(/"/g, '\\"')}"
expires: ${expiresAt.toISOString()}
priority: "High"
active: true
---

${title}
`;

  const fileName = `${now.toISOString().split('T')[0]}-${slug}.md`;
  fs.writeFileSync(path.join(BREAKING_DIR, fileName), frontmatter);
  seen[link] = true;
  added++;
  console.log(`   🚨 BREAKING DRAFT: ${fileName}`);
  return added;
}

// ================= MAIN ORCHESTRATOR =================
async function main() {
  console.log('🚀 RSS Automation Started — ' + new Date().toISOString());

  cleanupOldDrafts();

  let totalAdded = 0;
  
  // ১. রেগুলার নিউজ ফেচ
  for (const feed of FEEDS) {
    totalAdded += await processFeed(feed);
    await new Promise(r => setTimeout(r, 800));
  }

  // ২. ব্রেকিং নিউজ ফেচ
  for (const feed of BREAKING_FEEDS) {
    totalAdded += await processBreakingFeed(feed);
    await new Promise(r => setTimeout(r, 800));
  }

  fs.writeFileSync(SEEN_FILE, JSON.stringify(seen, null, 2));
  console.log(`\n✅ Done. Added ${totalAdded} drafts in total.`);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });