// Esqueleto mientras se descarga el código de una pantalla.
export const CargaPagina = () => (
    <div role="status" aria-live="polite" className="grid min-h-dvh place-items-center bg-crema">
        <div className="flex flex-col items-center gap-4">
            <img src="/marca/icono-192.png" alt="" width="72" height="72" className="size-18 animate-pulse rounded-2xl" />
            <span className="text-sm font-bold text-gris-texto">Cargando…</span>
        </div>
    </div>
);
