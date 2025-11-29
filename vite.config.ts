import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Chrome extension development: define multiple entry points
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'index.html'),
        content: resolve(__dirname, 'src/content.ts'),
        background: resolve(__dirname, 'src/background.ts'),
      },
      output: {
        // Ensure content.ts and background.ts output directly to src/ folder as specified in manifest.json
        entryFileNames: (chunkInfo) => {
          if (['content', 'background'].includes(chunkInfo.name)) {
            return `src/[name].js`;
          }
          // The popup (index.html) will use the default asset naming strategy for dynamic imports
          return `assets/[name]-[hash].js`;
        },
      }
    },
  },
})
