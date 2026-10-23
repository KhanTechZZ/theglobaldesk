const fs = require('fs');
const path = require('path');

const NEWS_DIR = path.join(__dirname, '..', 'news');

function backfill() {
  const files = fs.readdirSync(NEWS_DIR).filter(f => f.endsWith('.md'));
  let updated = 0;
  let skipped = 0;

  for (const file of files) {
    const filePath = path.join(NEWS_DIR, file);
    let content = fs.readFileSync(filePath, 'utf8');

    // Skip if already has imported_at
    if (/^imported_at:\s*.+$/m.test(content)) {
      skipped++;
      continue;
    }

    // Only backfill draft files (published: false)
    if (!/^published:\s*false\s*$/m.test(content)) {
      skipped++;
      continue;
    }

    // Get file modification time as imported_at
    const stat = fs.statSync(filePath);
    const importedAt = stat.mtime.toISOString();

    // Insert imported_at after date line
    content = content.replace(
      /^(date:\s*.+)$/m,
      `$1\nimported_at: ${importedAt}`
    );

    fs.writeFileSync(filePath, content);
    updated++;
    console.log(`✅ ${file} → imported_at: ${importedAt}`);
  }

  console.log(`\n📊 Done. Updated: ${updated}, Skipped: ${skipped}`);
}

backfill();