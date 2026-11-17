import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    // Mismo origen que el backend mockeado (window.env.backend.api): evita el preflight CORS que
    // msw 3 ya no responde solo para requests con Content-Type: application/json.
    environmentOptions: { jsdom: { url: "http://localhost:8080" } },
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    testTimeout: 15000,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/main.tsx",
        "src/routeTree.gen.ts",
        "src/**/*.d.ts",
      ],
    },
  },
  define: {
    global: "window",
  },
});
