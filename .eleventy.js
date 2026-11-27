

const isPlaceholderHeadline = (item) => {
  const title = String(item?.data?.title || "").trim();
  const description = String(item?.data?.description || "");
  return /^(?:\d+(?:st|nd|rd|th)?\s+news|test(?:\b|\s)|untitled\b|placeholder\b|sample\b|\[?demo\]?\b)/i.test(title) ||
    /lorem ipsum|placeholder text|sample report for testing|not real news|layout testing/i.test(description);
};

module.exports = function (eleventyConfig) {

  // Never publish private backups
  eleventyConfig.ignores.add("_backup_latest/**");
  // Keep known test articles out of generated public pages.
  eleventyConfig.ignores.add('news/2026-10-26-223.md');
  eleventyConfig.ignores.add('news/2026-10-26-test-news1.md');
  [
    'news/2026-11-02-demo-01-world.md',
    'news/2026-11-02-demo-02-asia.md',
    'news/2026-11-02-demo-03-politics.md',
    'news/2026-11-02-demo-04-economy.md',
    'news/2026-11-02-demo-05-ai.md',
    'news/2026-11-02-demo-06-science.md',
    'news/2026-11-02-demo-07-environment.md',
    'news/2026-11-02-demo-08-research.md',
    'news/2026-11-02-demo-09-explainer.md',
    'news/2026-11-02-demo-10-rights.md',
    'news/2026-11-02-demo-11-alpha.md',
    'news/2026-11-02-demo-12-connectivity.md',
    'news/2026-11-02-demo-13-business.md',
    'news/2026-11-02-demo-14-education.md',
    'news/2026-11-02-demo-15-energy.md'
  ].forEach(file => eleventyConfig.ignores.add(file));

  // Static assets — preserve the new homepage design
  eleventyConfig.addPassthroughCopy("homepage.css");
  eleventyConfig.addPassthroughCopy({ "data/trending.json": "trending.json" });
  // Keep the existing static pages' styles and logo available in the new build.
  eleventyConfig.addPassthroughCopy("style.css");
  eleventyConfig.addPassthroughCopy("homepage-reference.css");
  eleventyConfig.addPassthroughCopy("Logo.png");
  eleventyConfig.addPassthroughCopy("images");
  eleventyConfig.addPassthroughCopy({
    "images/favicon.ico": "favicon.ico",
    "images/favicon-16.png": "favicon-16.png",
    "images/favicon-32.png": "favicon-32.png",
    "images/favicon-48.png": "favicon-48.png",
    "images/android-chrome-512.png": "favicon.png",
    "images/apple-touch-icon.png": "apple-touch-icon.png",
    "images/site.webmanifest": "site.webmanifest"
  });
  eleventyConfig.addPassthroughCopy("admin");
  eleventyConfig.addPassthroughCopy("_private-cms");
  eleventyConfig.addPassthroughCopy("robots.txt");
  eleventyConfig.addPassthroughCopy("_routes.json");

  // Date filters
  eleventyConfig.addGlobalData("siteEditionDate", () =>
    new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "Asia/Dhaka"
    }).format(new Date())
  );
  eleventyConfig.addFilter("readableDate", (date) => {
    if (!date) return "";
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return "";
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "UTC"
    }).format(parsed);
  });

  // Show a relative timestamp for fresh stories, then switch to a calendar date.
  eleventyConfig.addFilter("relativeDate", (date) => {
    if (!date) return "";
    const publishedAt = new Date(date);
    if (Number.isNaN(publishedAt.getTime())) return "";
    const minutes = Math.floor((Date.now() - publishedAt.getTime()) / 60000);
    if (minutes < 0) return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(publishedAt);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} ${days === 1 ? "day" : "days"} ago`;
    return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(publishedAt);
  });

  eleventyConfig.addFilter("isoDate", (date) => {
    if (!date) return "";
    return new Date(date).toISOString();
  });

  // Keep the existing news and static-page JSON-LD templates compatible.
  eleventyConfig.addFilter("jsonify", (value) => JSON.stringify(value ?? ""));

  // News published within the last 48 hours
  eleventyConfig.addFilter("isRecent", (dateObj) => {
    const d = new Date(dateObj);
    if (Number.isNaN(d.getTime())) return false;
    const diff = Date.now() - d.getTime();
    return diff >= 0 && diff < 48 * 60 * 60 * 1000;
  });

  // Convert relative URLs to absolute URLs
  eleventyConfig.addFilter("absoluteUrl", (url, base) => {
    try {
      return new URL(url, base).toString();
    } catch (e) {
      return base + url;
    }
  });

  // Google News date format
  eleventyConfig.addFilter("dateToRfc3339", (date) => {
    const d = new Date(date);
    return Number.isNaN(d.getTime()) ? "" : d.toISOString();
  });
  eleventyConfig.addFilter("skip", (arr, count = 0) =>
    Array.isArray(arr) ? arr.slice(Math.max(0, Number(count) || 0)) : []
  );
  eleventyConfig.addFilter("take", (arr, count = 0) =>
    Array.isArray(arr) ? arr.slice(0, Math.max(0, Number(count) || 0)) : []
  );
  // Explicit Nunjucks filters
  eleventyConfig.addNunjucksFilter("take", (arr, count = 0) =>
    Array.isArray(arr) ? arr.slice(0, Math.max(0, Number(count) || 0)) : []
  );

  eleventyConfig.addNunjucksFilter("skip", (arr, count = 0) =>
    Array.isArray(arr) ? arr.slice(Math.max(0, Number(count) || 0)) : []
  );
  // Filter published news by category
  eleventyConfig.addNunjucksFilter("byCategory", (items, category) =>
    (Array.isArray(items) ? items : []).filter(item =>
      String(item.data.category || "").toLowerCase() === String(category || "").toLowerCase()
    )
  );
  // Filter published news by format
  eleventyConfig.addNunjucksFilter("byFormat", (items, format) =>
    (Array.isArray(items) ? items : []).filter(item =>
      String(item.data.format || "").toLowerCase() === String(format || "").toLowerCase()
    )
  );
  eleventyConfig.addNunjucksFilter("relatedNews", (items, currentUrl, category, limit = 3) => {
    const candidates = (Array.isArray(items) ? items : [])
      .filter(item => item.url !== currentUrl && !isPlaceholderHeadline(item));
    const normalizedCategory = String(category || "").trim().toLowerCase();
    const sameCategory = candidates.filter(item =>
      String(item.data.category || "").trim().toLowerCase() === normalizedCategory
    );
    const otherCategories = candidates.filter(item =>
      String(item.data.category || "").trim().toLowerCase() !== normalizedCategory
    );
    return [...sameCategory, ...otherCategories].slice(0, Math.max(0, Number(limit) || 0));
  });
  eleventyConfig.addNunjucksFilter("moreFromDesk", (items, currentUrl, excludedItems, limit = 5) => {
    const excludedUrls = new Set((Array.isArray(excludedItems) ? excludedItems : []).map(item => item.url));
    const fallbackPhoto = category => {
      const value = String(category || "").toLowerCase();
      if (/asia|south asia|asia-pacific/.test(value)) return "/images/more-from/asia-city.jpg";
      if (/environment|earth|climate|nature/.test(value)) return "/images/more-from/environment.jpg";
      if (/economy|business|finance/.test(value)) return "/images/more-from/economy.jpg";
      if (/technology|tech|innovation/.test(value)) return "/images/more-from/technology.jpg";
      if (/science|research|explainer/.test(value)) return "/images/more-from/science.jpg";
      if (/culture|heritage|travel/.test(value)) return "/images/more-from/asia-culture.jpg";
      if (/politic|conflict|diplomacy|world|united nations|human rights/.test(value)) return "/images/more-from/global-politics.jpg";
      return "/images/more-from/science.jpg";
    };
    return (Array.isArray(items) ? items : [])
      .filter(item => item.url !== currentUrl && !excludedUrls.has(item.url) && !isPlaceholderHeadline(item))
      .slice(0, Math.max(0, Number(limit) || 0))
      .map(item => ({
        ...item,
        moreFromDeskImage: item.data.image || fallbackPhoto(item.data.category),
        moreFromDeskIllustrative: !item.data.image
      }));
  });
  // News collection
  eleventyConfig.addCollection("news", (collectionApi) => {
    return collectionApi.getFilteredByGlob("./news/*.md")
      .filter(item => item.data.published === true && item.data.source !== "DEMO CONTENT - NOT FOR PUBLICATION" && !String(item.data.title || "").startsWith("[DEMO]"))
      .sort((a, b) => new Date(b.data.date || 0) - new Date(a.data.date || 0));
  });

  // Published news only
  eleventyConfig.addCollection("publishedNews", (collectionApi) => {
    return collectionApi.getFilteredByGlob("./news/*.md")
      .filter(item => item.data.published === true && item.data.source !== "DEMO CONTENT - NOT FOR PUBLICATION" && !String(item.data.title || "").startsWith("[DEMO]") && !["2026-10-26-223", "2026-10-26-test-news1"].includes(item.fileSlug))
      .sort((a, b) => new Date(b.data.date || 0) - new Date(a.data.date || 0));
  });

  // Homepage lead/latest are reserved for standard news; editorial formats
  // appear only in their own dedicated homepage sections.
  eleventyConfig.addCollection("homepageNews", (collectionApi) => {
    const reservedCategories = new Set(["explainer", "editorial", "perspectives", "z desk", "alpha desk", "featured voices"]);
    return collectionApi.getFilteredByGlob("./news/*.md")
      .filter(item => item.data.published === true &&
        item.data.source !== "DEMO CONTENT - NOT FOR PUBLICATION" &&
        !String(item.data.title || "").startsWith("[DEMO]") &&
        !["2026-10-26-223", "2026-10-26-test-news1"].includes(item.fileSlug) &&
        !reservedCategories.has(String(item.data.category || "").trim().toLowerCase()))
      .sort((a, b) => new Date(b.data.date || 0) - new Date(a.data.date || 0));
  });

  // The ticker is for usable editorial headlines; keep CMS test entries out of it.
  eleventyConfig.addCollection("headlineNews", (collectionApi) => {
    return collectionApi.getFilteredByGlob("./news/*.md")
      .filter(item => item.data.published === true &&
        item.data.source !== "DEMO CONTENT - NOT FOR PUBLICATION" &&
        !String(item.data.title || "").startsWith("[DEMO]") &&
        !["2026-10-26-223", "2026-10-26-test-news1"].includes(item.fileSlug) &&
        !isPlaceholderHeadline(item))
      .sort((a, b) => new Date(b.data.date || 0) - new Date(a.data.date || 0));
  });

    // Published World news only
  eleventyConfig.addCollection("worldNews", (collectionApi) => {
    return collectionApi.getFilteredByGlob("./news/*.md")
      .filter(item =>
        item.data.published === true &&
        String(item.data.category || "").toLowerCase() === "world" &&
        item.data.source !== "DEMO CONTENT - NOT FOR PUBLICATION" &&
        !String(item.data.title || "").startsWith("[DEMO]") &&
        !["2026-10-26-223", "2026-10-26-test-news1"].includes(item.fileSlug)
      )
      .sort((a, b) => new Date(b.data.date || 0) - new Date(a.data.date || 0));
  });
  // Published Asia news only
  eleventyConfig.addCollection("asiaNews", (collectionApi) => {
    return collectionApi.getFilteredByGlob("./news/*.md")
      .filter(item =>
        item.data.published === true &&
        String(item.data.category || "").toLowerCase() === "asia" &&
        item.data.source !== "DEMO CONTENT - NOT FOR PUBLICATION" &&
        !String(item.data.title || "").startsWith("[DEMO]") &&
        !["2026-10-26-223", "2026-10-26-test-news1"].includes(item.fileSlug)
      )
      .sort((a, b) => new Date(b.data.date || 0) - new Date(a.data.date || 0));
  });
  // Published Explainer news only
  eleventyConfig.addCollection("explainerNews", (collectionApi) => {
    return collectionApi.getFilteredByGlob("./news/*.md")
      .filter(item =>
        item.data.published === true &&
        String(item.data.category || "").toLowerCase() === "explainer" &&
        item.data.source !== "DEMO CONTENT - NOT FOR PUBLICATION" &&
        !String(item.data.title || "").startsWith("[DEMO]") &&
        !["2026-10-26-223", "2026-10-26-test-news1"].includes(item.fileSlug)
      )
      .sort((a, b) => new Date(b.data.date || 0) - new Date(a.data.date || 0));
  });
  // Published Opinion articles
  eleventyConfig.addCollection("opinionNews", (collectionApi) => {
    return collectionApi.getFilteredByGlob("./news/*.md")
      .filter(item =>
        item.data.published === true &&
        ["editorial", "perspectives"].includes(String(item.data.category || "").toLowerCase()) &&
        item.data.source !== "DEMO CONTENT - NOT FOR PUBLICATION" &&
        !String(item.data.title || "").startsWith("[DEMO]") &&
        !["2026-10-26-223", "2026-10-26-test-news1"].includes(item.fileSlug)
      )
      .sort((a, b) => new Date(b.data.date || 0) - new Date(a.data.date || 0));
  });

  // Published Earth articles
  eleventyConfig.addCollection("earthNews", (collectionApi) => {
    return collectionApi.getFilteredByGlob("./news/*.md")
      .filter(item =>
        item.data.published === true &&
        ["environment", "geography", "oceans", "science"].includes(String(item.data.category || "").toLowerCase()) &&
        item.data.source !== "DEMO CONTENT - NOT FOR PUBLICATION" &&
        !String(item.data.title || "").startsWith("[DEMO]") &&
        !["2026-10-26-223", "2026-10-26-test-news1"].includes(item.fileSlug)
      )
      .sort((a, b) => new Date(b.data.date || 0) - new Date(a.data.date || 0));
  });

  // Published Featured Voices
  eleventyConfig.addCollection("featuredVoices", (collectionApi) => {
    return collectionApi.getFilteredByGlob("./news/*.md")
      .filter(item =>
        item.data.published === true &&
        ["z desk", "alpha desk"].includes(String(item.data.category || "").toLowerCase()) &&
        item.data.source !== "DEMO CONTENT - NOT FOR PUBLICATION" &&
        !String(item.data.title || "").startsWith("[DEMO]") &&
        !["2026-10-26-223", "2026-10-26-test-news1"].includes(item.fileSlug)
      )
      .sort((a, b) => new Date(b.data.date || 0) - new Date(a.data.date || 0));
  });
  // Published Editorial articles
  eleventyConfig.addCollection("editorialNews", (collectionApi) => {
    return collectionApi.getFilteredByGlob("./news/*.md")
      .filter(item =>
        item.data.published === true &&
        String(item.data.category || "").toLowerCase() === "editorial" &&
        item.data.source !== "DEMO CONTENT - NOT FOR PUBLICATION" &&
        !String(item.data.title || "").startsWith("[DEMO]")
      )
      .sort((a, b) => new Date(b.data.date || 0) - new Date(a.data.date || 0));
  });

  // Published Perspectives articles
  eleventyConfig.addCollection("perspectivesNews", (collectionApi) => {
    return collectionApi.getFilteredByGlob("./news/*.md")
      .filter(item =>
        item.data.published === true &&
        String(item.data.category || "").toLowerCase() === "perspectives" &&
        item.data.source !== "DEMO CONTENT - NOT FOR PUBLICATION" &&
        !String(item.data.title || "").startsWith("[DEMO]")
      )
      .sort((a, b) => new Date(b.data.date || 0) - new Date(a.data.date || 0));
  });
// Live coverage collection
  eleventyConfig.addCollection("liveCoverage", (collectionApi) => {
    return collectionApi.getFilteredByGlob("./Live/*.md")
      .filter(item => item.data.published === true && item.data.source !== "DEMO CONTENT - NOT FOR PUBLICATION" && !String(item.data.title || "").startsWith("[DEMO]") && !["2026-10-26-223", "2026-10-26-test-news1"].includes(item.fileSlug))
      .sort((a, b) => new Date(b.data.started || b.data.date || 0) -
                      new Date(a.data.started || a.data.date || 0));
  });

  return {
    dir: {
      input: ".",
      output: "_site",
      layouts: "_includes"
    },
    templateFormats: ["md", "njk", "html", "liquid"],
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk"
  };
};

















