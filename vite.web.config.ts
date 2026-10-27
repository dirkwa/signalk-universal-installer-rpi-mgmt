import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import checker from 'vite-plugin-checker'

const here = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  root: 'web',
  // Relative asset URLs: the server mounts the webapp under its package name.
  base: './',
  // Copies the icon next to index.html, where both the App Store's appIcon
  // and the page's favicon read it.
  publicDir: '../static',
  build: { outDir: '../public', emptyOutDir: true },
  plugins: [
    react(),
    // Vite only transpiles; the checker fails the build on any type error.
    checker({ typescript: { root: `${here}web`, tsconfigPath: 'tsconfig.json' } })
  ]
})
