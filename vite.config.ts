import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
// Explicit .ts extensions: Vite's native config loader (planned default) requires them.
import { githubPagesPreview } from './scripts/vite/github-pages-preview.ts';
import { staticRoutePages } from './scripts/vite/static-route-pages.ts';
import { BASE_PATH } from './src/app/routes.ts';

// https://vite.dev/config/
export default defineConfig(({ isPreview }) => ({
  // The same base in dev, build and preview, so every mode exercises /Rip-PC/.
  base: BASE_PATH,
  // Dev serves index.html for any path. Preview does not: it serves dist/ the way GitHub Pages
  // does (real file per route, 404.html for the rest), so e2e tests check the deployed layout.
  appType: isPreview === true ? 'mpa' : 'spa',
  plugins: [react(), tailwindcss(), staticRoutePages(), githubPagesPreview()],
  build: {
    // dist/.vite/manifest.json maps source modules to chunks. The e2e smoke test reads it to
    // prove the 3D chunk stays off the landing page. Pages deploys skip dotfiles, so it is not published.
    manifest: true,
  },
}));
