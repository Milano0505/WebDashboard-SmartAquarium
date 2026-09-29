import { fileURLToPath } from "node:url"

import react from "@vitejs/plugin-react"

import tailwindcss from "@tailwindcss/vite"

import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react(), tailwindcss()],

  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },

  server: {
    host: "0.0.0.0",

    port: Number(process.env.PORT) || 5173,
  },
})
