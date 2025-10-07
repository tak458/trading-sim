import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    watch: false,
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
