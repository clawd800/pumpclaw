/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import tailwindcss from "@tailwindcss/vite";
import pkg from "./package.json" with { type: "json" };

export default defineConfig({
  // Custom domain - use root path
  base: "/",
  plugins: [react(), tailwindcss()],
  define: {
    "process.env": {},
    global: "globalThis",
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  resolve: {
    alias: [{ find: "@", replacement: resolve(__dirname, "./src") }],
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    target: "es2020",
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom"],
          "vendor-wagmi": ["wagmi", "viem", "@tanstack/react-query"],
        },
      },
    },
  },
  server: {
    port: 3001,
  },
  preview: {
    port: 3001,
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    css: false,
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["src/components/**"],
    },
  },
});
