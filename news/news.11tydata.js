module.exports = {
  eleventyComputed: {
    permalink: data => {
      const isDemo = data.source === "DEMO CONTENT - NOT FOR PUBLICATION" ||
        String(data.title || "").startsWith("[DEMO]");
      if (data.published !== true || isDemo) return false;
      const fileSlug = String(data.page?.fileSlug || "");
      const cleanSlug = String(data.urlSlug || fileSlug.replace(/^\d{4}-\d{2}-\d{2}-/, ""));
      return `/news/${cleanSlug}/`;
    }
  }
};
