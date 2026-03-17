import { defineConfig } from "rolldown";

export default defineConfig({
  input: "src/index.ts",
  platform: "node",
  external: [/^@modelcontextprotocol\//, /^zod/],
  output: {
    file: "dist/index.js",
    format: "esm",
    banner: "#!/usr/bin/env node",
  },
});
