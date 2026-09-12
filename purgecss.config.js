module.exports = {
  content: ["_site/**/*.html", "_site/**/*.js"],
  css: ["_site/assets/css/*.css"],
  output: "_site/assets/css/",
  skippedContentGlobs: ["_site/assets/**/*.html"],
  // The concept cloud builds its class names at runtime ("cw cw--" + category),
  // so the extractor never sees the full name and would drop the colours.
  safelist: {
    standard: ["cw", "is-held", "is-open"],
    deep: [/^cw--/],
  },
};
