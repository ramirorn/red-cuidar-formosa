import type { EstadoManzana, TipoIntervencion, TipoReporte } from '@prisma/client';
import { DIAS_VIGENCIA_LIMPIEZA } from '../services/manzana.services.js';

// Historia simulada de una manzana para la demostración: reportes, intervenciones y cambios de color
// de los últimos dos meses, coherentes con las reglas reales (así el recalculo diario no los pisa).

const DIA_MS = 24 * 60 * 60 * 1000;
export const DIAS_DE_HISTORIA = 60;
// La historia "vieja" termina 8 días atrás: lo reciente se arma según el color final buscado.
const FIN_HISTORIA_DIAS = DIAS_VIGENCIA_LIMPIEZA + 1;

// Generador pseudoaleatorio con semilla: la misma semilla da los mismos datos.
export const crearAzar = (semilla: number) => {
    let estado = semilla >>> 0;
    const siguiente = () => {
        estado = (estado + 0x6d2b79f5) >>> 0;
        let t = estado;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    return {
        numero: siguiente,
        entre: (minimo: number, maximo: number) => minimo + siguiente() * (maximo - minimo),
        si: (probabilidad: number) => siguiente() < probabilidad,
        uno: <T>(lista: readonly T[]) => lista[Math.floor(siguiente() * lista.length)]!,
    };
};
export type Azar = ReturnType<typeof crearAzar>;

export interface ReporteSimulado {
    id: string;
    tipo: TipoReporte;
    estado: 'PENDIENTE' | 'VALIDADO' | 'RECHAZADO' | 'RESUELTO';
    capturadoEn: Date;
    validadoEn: Date | null;
    reporteResueltoId: string | null;
}

export interface IntervencionSimulada {
    tipo: TipoIntervencion;
    realizadaEn: Date;
}

export interface CambioSimulado {
    anterior: EstadoManzana;
    nuevo: EstadoManzana;
    en: Date;
    motivo: string;
}

export interface HistoriaManzana {
    reportes: ReporteSimulado[];
    intervenciones: IntervencionSimulada[];
    cambios: CambioSimulado[];
    estadoFinal: EstadoManzana;
    ultimaLimpiezaEn: Date | null;
    ultimoReporteEn: Date | null;
}

// Reparto "realista": las zonas más cuidadas tienen más verde y menos rojo (≈55 % verde, 30 % amarillo, 15 % rojo).
export const elegirColorFinal = (azar: Azar, cuidado: number): Exclude<EstadoManzana, 'SIN_DATOS'> => {
    const verde = Math.min(0.85, Math.max(0.2, 0.55 + (cuidado - 0.55) * 0.9));
    const rojo = Math.min(0.35, Math.max(0.03, 0.15 - (cuidado - 0.55) * 0.35));
    const tirada = azar.numero();
    return tirada < verde ? 'VERDE' : tirada < verde + rojo ? 'ROJO' : 'AMARILLO';
};

interface Opciones {
    ahora: Date;
    cuidado: number;
    colorFinal: Exclude<EstadoManzana, 'SIN_DATOS'>;
    // Desde cuándo una limpieza no queda "lavada" por la lluvia (después de la última lluvia fuerte).
    limpiezaSeguraDesde: Date;
    conPendiente: boolean;
}

export const simularHistoria = (azar: Azar, { ahora, cuidado, colorFinal, limpiezaSeguraDesde, conPendiente }: Opciones): HistoriaManzana => {
    const reportes: ReporteSimulado[] = [];
    const intervenciones: IntervencionSimulada[] = [];
    const hace = (dias: number) => new Date(ahora.getTime() - dias * DIA_MS);
    const validar = (capturado: Date) => new Date(Math.min(capturado.getTime() + azar.entre(2, 30) * 60 * 60 * 1000, ahora.getTime() - 60_000));
    const criaderoAbierto = () => reportes.find((reporte) => reporte.tipo !== 'LIMPIEZA' && reporte.estado === 'VALIDADO');

    const limpiar = (en: Date) => {
        // Solo cierra un criadero anterior a la limpieza, y se valida después que él.
        const abierto = criaderoAbierto();
        const cierra = abierto && abierto.capturadoEn < en ? abierto : null;
        if (cierra) cierra.estado = 'RESUELTO';
        const validado = validar(en);
        const validadoEn = cierra ? new Date(Math.min(Math.max(validado.getTime(), cierra.validadoEn!.getTime() + 60_000), ahora.getTime() - 30_000)) : validado;
        reportes.push({ id: crypto.randomUUID(), tipo: 'LIMPIEZA', estado: 'VALIDADO', capturadoEn: en, validadoEn, reporteResueltoId: cierra?.id ?? null });
    };
    const criadero = (en: Date) => {
        reportes.push({ id: crypto.randomUUID(), tipo: azar.si(0.85) ? 'CRIADERO' : 'MICROBASURAL', estado: 'VALIDADO', capturadoEn: en, validadoEn: validar(en), reporteResueltoId: null });
    };

    // 1. Historia vieja: semanas con limpiezas (más en zonas cuidadas), algún criadero que se resuelve,
    //    reportes rechazados y visitas de la brigada.
    for (let dias = DIAS_DE_HISTORIA; dias > FIN_HISTORIA_DIAS; dias -= 7) {
        const momento = () => hace(Math.max(FIN_HISTORIA_DIAS + 0.5, dias - azar.entre(0, 7)));
        if (azar.si((1 - cuidado) * 0.25)) {
            const en = momento();
            criadero(en);
            if (azar.si(0.85)) limpiar(new Date(Math.min(en.getTime() + azar.entre(1, 5) * DIA_MS, hace(FIN_HISTORIA_DIAS).getTime())));
        }
        if (azar.si(cuidado * 0.7)) limpiar(momento());
        if (azar.si(0.04)) reportes.push({ id: crypto.randomUUID(), tipo: 'CRIADERO', estado: 'RECHAZADO', capturadoEn: momento(), validadoEn: null, reporteResueltoId: null });
        if (azar.si(0.05)) intervenciones.push({ tipo: azar.uno(['APLICACION_BTI', 'DESCACHARRADO', 'FUMIGACION', 'INSPECCION'] as const), realizadaEn: momento() });
    }
    // Lo viejo no deja criaderos abiertos: el rojo final se decide abajo.
    const viejo = criaderoAbierto();
    if (viejo) limpiar(new Date(Math.min(viejo.capturadoEn.getTime() + DIA_MS, hace(FIN_HISTORIA_DIAS).getTime())));

    // 2. Lo reciente según el color buscado.
    if (colorFinal === 'VERDE') {
        const desde = Math.max(limpiezaSeguraDesde.getTime(), hace(DIAS_VIGENCIA_LIMPIEZA - 0.5).getTime());
        const en = new Date(desde + azar.numero() * (ahora.getTime() - 60 * 60 * 1000 - desde));
        if (azar.si(0.12)) intervenciones.push({ tipo: azar.uno(['APLICACION_BTI', 'DESCACHARRADO'] as const), realizadaEn: en });
        else limpiar(en);
    } else if (colorFinal === 'ROJO') {
        // Más nuevo que toda la historia vieja: ninguna limpieza anterior lo cierra.
        criadero(hace(azar.entre(0.3, FIN_HISTORIA_DIAS - 1)));
        if (azar.si(0.2)) intervenciones.push({ tipo: 'INSPECCION', realizadaEn: hace(azar.entre(0.2, 3)) });
    } else {
        // Amarillo: limpieza vencida (o solo actividad vieja) y, a veces, un reporte esperando revisión.
        if (!reportes.some((reporte) => reporte.tipo === 'LIMPIEZA') || azar.si(0.4)) limpiar(hace(azar.entre(FIN_HISTORIA_DIAS, 30)));
    }
    if (conPendiente && colorFinal === 'AMARILLO') {
        // Menos de 72 h: si no, la tarea de privacidad lo descarta.
        reportes.push({ id: crypto.randomUUID(), tipo: 'CRIADERO', estado: 'PENDIENTE', capturadoEn: hace(azar.entre(0.1, 2.5)), validadoEn: null, reporteResueltoId: null });
    }

    // 3. Cambios de color a lo largo del tiempo, con las mismas reglas que el sistema (sin lluvia).
    interface Evento { en: Date; desde?: Date; limpia?: boolean; cierra?: boolean; criadero?: boolean; motivo: string }
    const eventos: Evento[] = [
        ...reportes.flatMap((reporte): Evento[] => {
            if (reporte.estado === 'PENDIENTE') return [];
            // La vigencia de 7 días corre desde la foto de la limpieza, como en el sistema.
            if (reporte.tipo === 'LIMPIEZA') return [{ en: reporte.validadoEn!, desde: reporte.capturadoEn, limpia: true, cierra: reporte.reporteResueltoId !== null, motivo: 'Limpieza validada' }];
            if (reporte.estado === 'RECHAZADO') return [{ en: reporte.capturadoEn, motivo: 'Reporte revisado' }];
            return [{ en: reporte.validadoEn!, criadero: true, motivo: 'Criadero validado' }];
        }),
        ...intervenciones.map((intervencion): Evento => ({
            en: intervencion.realizadaEn,
            desde: intervencion.realizadaEn,
            limpia: intervencion.tipo === 'APLICACION_BTI' || intervencion.tipo === 'DESCACHARRADO',
            motivo: 'Intervención de brigada',
        })),
    ].sort((a, b) => a.en.getTime() - b.en.getTime());

    const cambios: CambioSimulado[] = [];
    let estado = 'SIN_DATOS' as EstadoManzana;
    let abiertos = 0;
    let vence: Date | null = null;
    const cambiar = (nuevo: EstadoManzana, en: Date, motivo: string) => {
        if (nuevo !== estado) cambios.push({ anterior: estado, nuevo, en, motivo: `Simulación: ${motivo}` });
        estado = nuevo;
    };
    for (const evento of eventos) {
        if (vence && vence <= evento.en && estado === 'VERDE') cambiar('AMARILLO', vence, 'venció la limpieza');
        if (evento.criadero) abiertos++;
        if (evento.limpia) {
            if (evento.cierra) abiertos = Math.max(0, abiertos - 1);
            vence = new Date((evento.desde ?? evento.en).getTime() + DIAS_VIGENCIA_LIMPIEZA * DIA_MS);
        }
        const vigente = vence !== null && vence > evento.en;
        cambiar(abiertos > 0 ? 'ROJO' : vigente ? 'VERDE' : 'AMARILLO', evento.en, evento.motivo);
    }
    if (vence && vence <= ahora && estado === 'VERDE') cambiar('AMARILLO', vence, 'venció la limpieza');

    const limpiezas = [
        ...reportes.filter((reporte) => reporte.tipo === 'LIMPIEZA' && reporte.estado === 'VALIDADO').map((reporte) => reporte.capturadoEn.getTime()),
        ...intervenciones.filter((intervencion) => intervencion.tipo === 'APLICACION_BTI' || intervencion.tipo === 'DESCACHARRADO').map((intervencion) => intervencion.realizadaEn.getTime()),
    ];
    const capturas = reportes.map((reporte) => reporte.capturadoEn.getTime());

    return {
        reportes,
        intervenciones,
        cambios,
        estadoFinal: estado,
        ultimaLimpiezaEn: limpiezas.length ? new Date(Math.max(...limpiezas)) : null,
        ultimoReporteEn: capturas.length ? new Date(Math.max(...capturas)) : null,
    };
};
