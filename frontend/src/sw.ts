/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core';
import { ExpirationPlugin } from 'workbox-expiration';
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst } from 'workbox-strategies';
import { abrirBase } from '@/sinConexion/bd';
import { ETIQUETA_SINCRONIZACION, sincronizarCola } from '@/sinConexion/cola';

// Service worker de la PWA: funciona sin conexión, envía reportes en segundo plano y muestra las alertas.

declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: (string | { url: string; revision: string | null })[] };

interface EventoSincronizacion extends ExtendableEvent {
    readonly tag: string;
}

// Toda la app (pantallas, estilos, tipografías y logos) queda guardada en el celular.
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();
void self.skipWaiting();
clientsClaim();

// Cualquier dirección de la app abre el index guardado (las rutas las resuelve React Router).
registerRoute(new NavigationRoute(createHandlerBoundToURL('/index.html'), { denylist: [/^\/api\//] }));

// Mapa base de OpenStreetMap: se guardan las zonas ya vistas, con un tope moderado.
registerRoute(
    ({ url }) => url.hostname === 'tile.openstreetmap.org',
    new CacheFirst({ cacheName: 'teselas-mapa', plugins: [new ExpirationPlugin({ maxEntries: 400, maxAgeSeconds: 30 * 24 * 60 * 60 })] }),
);

// Código del detector (TensorFlow.js): no se precarga por su tamaño; se guarda al primer uso.
registerRoute(
    ({ url }) => url.origin === self.location.origin && url.pathname.startsWith('/assets/detector.worker-'),
    new CacheFirst({ cacheName: 'detector', plugins: [new ExpirationPlugin({ maxEntries: 3 })] }),
);

// Pesos del modelo de detección: se descargan una vez y quedan para usar sin conexión.
registerRoute(
    ({ url }) => url.hostname === 'storage.googleapis.com' || url.hostname.endsWith('tfhub.dev') || url.hostname.endsWith('kaggle.com'),
    new CacheFirst({ cacheName: 'modelo-ia', plugins: [new ExpirationPlugin({ maxEntries: 40, maxAgeSeconds: 90 * 24 * 60 * 60 })] }),
);

// Mapa comunitario y localidades: red primero; sin señal, la última versión vista.
registerRoute(
    ({ url, request }) => request.method === 'GET' && /^\/api\/(manzanas|localidades)/.test(url.pathname),
    new NetworkFirst({ cacheName: 'mapa-barrio', networkTimeoutSeconds: 4, plugins: [new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 7 * 24 * 60 * 60 })] }),
);

// Background Sync: el navegador despierta al service worker cuando vuelve la señal.
self.addEventListener('sync', (evento) => {
    const sincronizacion = evento as EventoSincronizacion;
    if (sincronizacion.tag === ETIQUETA_SINCRONIZACION) sincronizacion.waitUntil(sincronizarCola());
});

interface MensajePush {
    titulo?: string;
    cuerpo?: string;
    url?: string;
    tipo?: string;
}

// Alertas post-lluvia enviadas por la API (Web Push).
self.addEventListener('push', (evento) => {
    let datos: MensajePush = {};
    try { datos = (evento.data?.json() as MensajePush) ?? {}; } catch { datos = { cuerpo: evento.data?.text() ?? '' }; }
    const titulo = datos.titulo ?? 'Red-Cuidar Formosa';
    const cuerpo = datos.cuerpo ?? 'Revisá los recipientes con agua de tu patio.';

    evento.waitUntil((async () => {
        await (await abrirBase()).add('alertas', { titulo, cuerpo, ...(datos.url ? { url: datos.url } : {}), fecha: new Date().toISOString() });
        await self.registration.showNotification(titulo, {
            body: cuerpo,
            icon: '/marca/icono-192.png',
            badge: '/marca/favicon-64.png',
            tag: datos.tipo ?? 'red-cuidar',
            data: { url: datos.url ?? '/app' },
        });
    })());
});

self.addEventListener('notificationclick', (evento) => {
    evento.notification.close();
    const destino = new URL((evento.notification.data as { url?: string } | undefined)?.url ?? '/app', self.location.origin).href;
    evento.waitUntil((async () => {
        const ventanas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        const abierta = ventanas.find((ventana) => ventana.url.startsWith(self.location.origin));
        if (abierta) {
            await abierta.focus();
            return abierta.navigate(destino);
        }
        return self.clients.openWindow(destino);
    })());
});
