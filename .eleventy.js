module.exports = function(eleventyConfig) {
  // Passthrough copies
  eleventyConfig.addPassthroughCopy("style.css");
  eleventyConfig.addPassthroughCopy("app.js");
  eleventyConfig.addPassthroughCopy("Logo.png");
  eleventyConfig.addPassthroughCopy("admin");
  eleventyConfig.addPassthroughCopy("functions");
  eleventyConfig.addPassthroughCopy("images");
  eleventyConfig.addPassthroughCopy("robots.txt");
  eleventyConfig.addPassthroughCopy("homepage-reference.css");

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

  // Absolute URL filter (Sitemap-এর জন্য দরকার)
  eleventyConfig.addFilter("absoluteUrl", function(url, base) {
    try {
      return new URL(url, base).toString();
    } catch (e) {
      return base + url;
    }
  });

  // Date to RFC3339 filter (Google News-এর জন্য দরকার)
  eleventyConfig.addFilter("dateToRfc3339", function(date) {
    const d = new Date(date);
    return d.toISOString();
  });

  // ✅ NEW: Relative Time filter (Just now, 2 hours ago, etc.)
  eleventyConfig.addFilter("timeAgo", (dateObj) => {
    if (!dateObj) return "";
    const d = new Date(dateObj);
    if (isNaN(d.getTime())) return "";
    
    const now = new Date();
    const diffMs = now - d;
    const seconds = Math.floor(diffMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (seconds < 60) return "Just now";
    if (minutes < 60) return minutes + " min ago";
    if (hours < 24) return hours + (hours === 1 ? " hour ago" : " hours ago");
    if (days < 7) return days + (days === 1 ? " day ago" : " days ago");
    
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  });

  // ✅ NEW: Filter posts by category
  eleventyConfig.addFilter("byCategory", (posts, category) => {
    if (!posts || !Array.isArray(posts)) return [];
    return posts.filter(post => {
      const postCategory = post.data && post.data.category;
      return postCategory === category;
    });
  });

  // News Collection তৈরি করা
  eleventyConfig.addCollection("news", function(collectionApi) {
    return collectionApi.getFilteredByGlob("./news/*.md");
  });

  return {
    dir: { input: ".", output: "_site" },
    serverOptions: { host: "0.0.0.0" }
  };
};