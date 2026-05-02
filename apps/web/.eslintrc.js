/** @type {import('eslint').Linter.Config} */
module.exports = {
  extends: [require.resolve("@leaseKo/config/eslint"), "next/core-web-vitals"],
  rules: {
    "react/no-unescaped-entities": "off",
  },
};
