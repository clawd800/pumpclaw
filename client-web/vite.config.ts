import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react(), tailwindcss()],
    define: {
      "process.env": {},
      global: "globalThis",
      "import.meta.env.VITE_REOWN_PROJECT_ID": JSON.stringify(
        env.VITE_REOWN_PROJECT_ID
      ),
    },
    envPrefix: "VITE_",
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
            "vendor-appkit": ["@reown/appkit", "@reown/appkit-adapter-wagmi"],
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
  };
});
