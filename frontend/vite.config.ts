import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
    plugins: [react(), tailwindcss()],
    resolve: {
        alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    server: {
        port: 5173,
        // Mismo origen que la API: así viaja la cookie httpOnly de refresco (SameSite=Strict).
        proxy: { '/api': { target: process.env.URL_API ?? 'http://localhost:3000', changeOrigin: false } },
    },
    test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: ['src/pruebas/preparacion.ts'],
    },
});
