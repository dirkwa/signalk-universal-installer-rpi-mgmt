import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import checker from 'vite-plugin-checker'

const here = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  root: 'web',
  // Relative asset URLs: the server mounts the webapp under its package name.
  base: './',
  // The icon lives at the package root, where the App Store reads it; copy it
  // next to index.html rather than keeping a second copy.
  publicDir: '../static',
  build: { outDir: '../public', emptyOutDir: true },
  plugins: [
    react(),
    // Vite only transpiles; the checker fails the build on any type error.
    checker({ typescript: { root: `${here}web`, tsconfigPath: 'tsconfig.json' } })
  ]
})
