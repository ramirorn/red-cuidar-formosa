import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from '@/App';
import { registerSW } from 'virtual:pwa-register';
import '@/estilos/global.css';

// Instala el service worker (en producción): app sin conexión, envío en segundo plano y alertas.
if ('serviceWorker' in navigator && import.meta.env.PROD) registerSW({ immediate: true });

const raiz = document.getElementById('raiz');
if (!raiz) throw new Error('No se encontró el elemento raíz');

createRoot(raiz).render(
    <StrictMode>
        <App />
    </StrictMode>,
);
