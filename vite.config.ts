import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  // Absolut, nicht relativ ("./") – die App nutzt Client-seitiges Routing
  // (React Router) auf verschachtelten Pfaden wie /rezepte/:id oder
  // /teilen/:token. Mit einer relativen Basis würden Asset-Pfade beim
  // direkten Aufruf/Neuladen solcher URLs falsch aufgelöst (404), da der
  // Browser sie relativ zum aktuellen URL-Pfad statt zur Seiten-Wurzel
  // interpretiert. Die App wird an der Domain-Wurzel gehostet (Netlify).
  base: '/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Löffelbande',
        short_name: 'Löffelbande',
        description: 'Rezepte inventarisieren, katalogisieren und Vorrat & Einkaufsliste verwalten',
        theme_color: '#f2814a',
        background_color: '#faf8f5',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
})
