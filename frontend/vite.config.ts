import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    include: ["guacamole-common-js"],
  },
  build: {
    commonjsOptions: {
      include: [/guacamole-common-js/],
    },
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes("node_modules/react") || id.includes("node_modules/react-dom") || id.includes("node_modules/react-router")) {
            return "vendor-react"
          }
          if (id.includes("node_modules/guacamole-common-js")) {
            return "vendor-guac"
          }
          if (id.includes("node_modules/@radix-ui")) {
            return "vendor-ui"
          }
          if (id.includes("node_modules/")) {
            return "vendor"
          }
        },
      },
    },
  },
})