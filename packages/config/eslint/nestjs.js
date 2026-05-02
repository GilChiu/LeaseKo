/** @type {import('eslint').Linter.Config} */
module.exports = {
  extends: [require.resolve("./index.js")],
  rules: {
    // Enforce NestJS Logger usage — block console.log/console.info in service code.
    // Use Logger from @nestjs/common instead:
    //   private readonly logger = new Logger(MyService.name);
    //   this.logger.log('message');
    //
    // console.error, console.warn, and console.debug are still allowed as a
    // safety valve, but NestJS Logger equivalents are preferred.
    "no-console": ["error", { allow: ["error", "warn", "debug"] }],
  },
  overrides: [
    {
      // Bootstrap entry point — console.log is acceptable for startup messages
      // (e.g., "API running on http://localhost:3001").
      files: ["src/main.ts"],
      rules: {
        "no-console": "off",
      },
    },
  ],
};
