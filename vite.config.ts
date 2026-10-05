import react from "@vitejs/plugin-react"
import { defineConfig, type Plugin } from "vite"

/**
 * The entry opens IndexedDB first and only then imports the app, so the browser would not ask for
 * the app chunk until the save is loaded. Preloading the boot chunks from the HTML downloads them
 * alongside the entry. A modulepreload fetches and parses; it does not run the module, so the
 * store still boots after the save is sealed.
 */
function preloadBootChunks(entries: readonly string[]): Plugin {
  let base = "/"
  return {
    name: "preload-boot-chunks",
    apply: "build",
    configResolved(config) {
      base = config.base
    },
    transformIndexHtml: {
      order: "post",
      handler(_html, ctx) {
        const chunks = Object.values(ctx.bundle ?? {}).filter(
          (chunk) => chunk.type === "chunk" && entries.some((entry) => chunk.facadeModuleId?.endsWith(entry)),
        )
        return chunks.map((chunk) => ({
          tag: "link",
          attrs: { rel: "modulepreload", crossorigin: "", href: `${base}${chunk.fileName}` },
          injectTo: "head" as const,
        }))
      },
    },
  }
}

export default defineConfig({
  plugins: [react(), preloadBootChunks(["/src/game/ledgerDexie.ts", "/src/startApp.tsx"])],
  server: {
    host: "127.0.0.1",
    port: 43123,
    strictPort: true,
  },
})
