module.exports = {
  layout: "news.njk",
  tags: "news",
  eleventyComputed: {
    permalink: (data) => {
      // ✅ Return actual boolean false (not string "false")
      if (data.published === false) {
        return false;
      }
      return `/news/${data.page.fileSlug}/`;
    },
    eleventyExcludeFromCollections: (data) => {
      return data.published === false;
    }
  }
};