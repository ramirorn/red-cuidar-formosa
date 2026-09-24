import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        include: ['src/**/*.test.ts'],
        env: {
            NODE_ENV: 'test',
            DATABASE_URL: 'postgresql://prueba:prueba@localhost:5432/prueba',
            JWT_SECRET: 'secreto-institucional-de-pruebas-0123456789',
            JWT_SECRET_SESIONES: 'secreto-sesiones-anonimas-de-pruebas-0123456789',
            CLAVE_SERVICIO_INTERNO: 'clave-servicio-interno-de-pruebas-0123456789',
            DIR_EVIDENCIAS: '/tmp/red-cuidar-pruebas/evidencias',
            REDIS_URL: '',
        },
    },
});
