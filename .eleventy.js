module.exports = function(eleventyConfig) {
  // Passthrough copies
  eleventyConfig.addPassthroughCopy("style.css");
  eleventyConfig.addPassthroughCopy("app.js");
  eleventyConfig.addPassthroughCopy("Logo.png");
  eleventyConfig.addPassthroughCopy("admin");
  eleventyConfig.addPassthroughCopy("functions");
  eleventyConfig.addPassthroughCopy("images");
  eleventyConfig.addPassthroughCopy("robots.txt");

  // Existing Filters
  eleventyConfig.addFilter("readableDate", (dateObj) => {
    const d = new Date(dateObj);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return `${days[d.getDay()]} ${months[d.getMonth()]} ${d.getDate()} ${d.getFullYear()}`;
  });

  eleventyConfig.addFilter("readableTime", (dateObj) => {
    const d = new Date(dateObj);
    const h = String(d.getHours()).padStart(2, "0");
    const m = String(d.getMinutes()).padStart(2, "0");
    const s = String(d.getSeconds()).padStart(2, "0");
    return `${h}:${m}:${s}`;
  });

  eleventyConfig.addFilter("isoDate", (dateObj) => {
    return new Date(dateObj).toISOString();
  });

  eleventyConfig.addFilter("jsonify", (value) => {
    const safe = (value === undefined || value === null) ? "" : value;
    return JSON.stringify(safe);
  });

  // Filter news from last 48 hours
  eleventyConfig.addFilter("isRecent", (dateObj) => {
    const d = new Date(dateObj);
    const now = new Date();
    const diff = now - d;
    return diff < 48 * 60 * 60 * 1000;
  });

  // ✅ NEW: Absolute URL filter (Sitemap-এর জন্য দরকার)
  eleventyConfig.addFilter("absoluteUrl", function(url, base) {
    try {
      return new URL(url, base).toString();
    } catch (e) {
      return base + url;
    }
  });

  // ✅ NEW: Date to RFC3339 filter (Google News-এর জন্য দরকার)
  eleventyConfig.addFilter("dateToRfc3339", function(date) {
    const d = new Date(date);
    return d.toISOString();
  });

  // ✅ NEW: News Collection তৈরি করা (সাইটম্যাপে নিউজ লিস্ট পেতে)
  eleventyConfig.addCollection("news", function(collectionApi) {
    return collectionApi.getFilteredByGlob("./news/*.md");
  });

  return {
    dir: { input: ".", output: "_site" },
    serverOptions: { host: "0.0.0.0" }
  };
};