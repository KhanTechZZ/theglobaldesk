module.exports = {
  eleventyComputed: {
    permalink: data => {
      const isDemo = data.source === "DEMO CONTENT - NOT FOR PUBLICATION" ||
        String(data.title || "").startsWith("[DEMO]");
      return data.published === true && !isDemo ? undefined : false;
    }
  }
};
