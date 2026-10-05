import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// Where the API server listens
const apiTarget = process.env.API_URL ?? "http://localhost:4000";

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy: { "/api": apiTarget } },
  preview: { port: 5173, proxy: { "/api": apiTarget } },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    css: false,
  },
});
