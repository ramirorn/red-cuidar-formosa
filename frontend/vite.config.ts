import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
    plugins: [
        react(),
        tailwindcss(),
        VitePWA({
            // Service worker propio (src/sw.ts): además del precache maneja Background Sync y push.
            strategies: 'injectManifest',
            srcDir: 'src',
            filename: 'sw.ts',
            registerType: 'autoUpdate',
            injectRegister: false,
            injectManifest: {
                globPatterns: ['**/*.{js,css,html,woff2,png,webp,svg}'],
                // - Íconos grandes: solo los usa el sistema al instalar la app.
                // - Detector (TensorFlow.js, ~2 MB): se guarda la primera vez que se abre el escáner (ver sw.ts),
                //   así la instalación inicial es liviana para datos móviles.
                globIgnores: ['**/marca/icono-512.png', '**/marca/icono-maskable-512.png', '**/marca/apple-touch-icon.png', '**/assets/detector.worker-*.js'],
            },
            manifest: {
                name: 'Red-Cuidar Formosa',
                short_name: 'Red-Cuidar',
                description: 'Detectá criaderos de mosquitos con tu celular y pintá tu manzana de verde.',
                lang: 'es-AR',
                start_url: '/app',
                scope: '/',
                display: 'standalone',
                orientation: 'portrait',
                background_color: '#fbf8f1',
                theme_color: '#1e8c2f',
                categories: ['health', 'utilities'],
                icons: [
                    { src: '/marca/icono-192.png', sizes: '192x192', type: 'image/png' },
                    { src: '/marca/icono-512.png', sizes: '512x512', type: 'image/png' },
                    { src: '/marca/icono-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
                ],
                shortcuts: [
                    { name: 'Escanear mi patio', url: '/app/escanear?nuevo=1', icons: [{ src: '/marca/icono-192.png', sizes: '192x192' }] },
                    { name: 'Mapa del barrio', url: '/app/mapa', icons: [{ src: '/marca/icono-192.png', sizes: '192x192' }] },
                ],
            },
        }),
    ],
    resolve: {
        alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    server: {
        port: 5173,
        // Mismo origen que la API: así viaja la cookie httpOnly de refresco (SameSite=Strict).
        proxy: { '/api': { target: process.env.URL_API ?? 'http://localhost:3000', changeOrigin: false } },
    },
    // La vista previa de producción usa el mismo proxy (prueba del service worker con la API real).
    preview: {
        port: 4173,
        proxy: { '/api': { target: process.env.URL_API ?? 'http://localhost:3000', changeOrigin: false } },
    },
    test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: ['src/pruebas/preparacion.ts'],
    },
});
