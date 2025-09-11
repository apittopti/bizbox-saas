module.exports = {
  root: true,
  extends: ["@bizbox/eslint-config"],
  ignorePatterns: [
    "node_modules/",
    "dist/",
    ".next/",
    "coverage/",
    "*.config.js",
    "*.config.ts"
  ]
};