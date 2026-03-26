import { defineConfig } from "vite-plus";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
  staged: {
    "*": "vp check --fix",
  },
  lint: {
    plugins: ["oxc", "typescript", "unicorn", "react"],
    ignorePatterns: ["dist"],
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  plugins: [tailwindcss(), react(), cloudflare()],
  server: {
    host: true,
    allowedHosts: true,
  },
});