import { defineConfig } from 'vitest/config';

// Pruebas de integración contra PostgreSQL + PostGIS reales.
// Requieren una base exclusiva de pruebas (su nombre debe contener "pruebas"): cada archivo la vacía.
export default defineConfig({
    test: {
        include: ['src/pruebas/integracion/**/*.test.ts'],
        globalSetup: ['src/pruebas/integracion/preparacion.ts'],
        // Comparten la misma base: los archivos se ejecutan de a uno.
        fileParallelism: false,
        testTimeout: 30_000,
        hookTimeout: 60_000,
        env: {
            NODE_ENV: 'test',
            DATABASE_URL: process.env.DATABASE_URL_PRUEBAS
                ?? 'postgresql://rol_api:clave_api@localhost:5432/red_cuidar_pruebas',
            PRISMA_REGISTRAR_CONSULTAS: 'true',
            JWT_SECRET: 'secreto-institucional-de-integracion-0123456789',
            JWT_SECRET_SESIONES: 'secreto-sesiones-de-integracion-0123456789',
            CLAVE_SERVICIO_INTERNO: 'clave-servicio-de-integracion-0123456789',
            DIR_EVIDENCIAS: '/tmp/red-cuidar-integracion/evidencias',
            REDIS_URL: '',
            // Par VAPID generado solo para pruebas (los envíos se simulan).
            VAPID_CLAVE_PUBLICA: 'BIsDHIe_vio3U38FsKkx6nxWVdwqAAD2vAnGBJDzUyAJsodUif23AFcBxfLIjRHrv1o5zJtyWSSRr2IFO_gmUms',
            VAPID_CLAVE_PRIVADA: '9LlQ5O681CzL5BiwepyB_z-KVlkxOBlaAP_zgcsyL0o',
        },
    },
});
