import { describe, expect, it } from 'vitest';
import { calcularEstadoManzana, type DatosEstadoManzana } from '../services/manzana.services.js';
import { esTransicionValida } from '../services/reporte.services.js';
import { PERMISOS, PERMISOS_POR_ROL, tienePermiso } from '../config/permisos.js';
import { alcanceLocalidad } from '../utils/alcance.js';
import { escaparCsv } from '../utils/csv.js';
import { ErrorHttp } from '../utils/errorHttp.js';

const DIA = 24 * 60 * 60 * 1000;
const ahora = new Date('2026-09-24T12:00:00Z');

const base: DatosEstadoManzana = {
    tieneCriaderoActivo: false,
    tienePendientes: false,
    tieneActividad: true,
    ultimaLimpiezaEn: null,
    lluviaPosteriorMm: 0,
};

describe('calcularEstadoManzana', () => {
    it('queda SIN_DATOS si nunca hubo actividad', () => {
        expect(calcularEstadoManzana({ ...base, tieneActividad: false }, ahora)).toBe('SIN_DATOS');
    });

    it('pasa a ROJO con un criadero validado aunque haya limpieza reciente', () => {
        expect(calcularEstadoManzana({ ...base, tieneCriaderoActivo: true, ultimaLimpiezaEn: ahora }, ahora)).toBe('ROJO');
    });

    it('queda VERDE con limpieza vigente y sin pendientes', () => {
        expect(calcularEstadoManzana({ ...base, ultimaLimpiezaEn: new Date(ahora.getTime() - 2 * DIA) }, ahora)).toBe('VERDE');
    });

    it('vuelve a AMARILLO cuando la limpieza vence a los 7 días', () => {
        expect(calcularEstadoManzana({ ...base, ultimaLimpiezaEn: new Date(ahora.getTime() - 8 * DIA) }, ahora)).toBe('AMARILLO');
    });

    it('vuelve a AMARILLO si llovió 10 mm o más después de la limpieza', () => {
        expect(calcularEstadoManzana({ ...base, ultimaLimpiezaEn: ahora, lluviaPosteriorMm: 12 }, ahora)).toBe('AMARILLO');
    });

    it('queda AMARILLO si hay reportes pendientes de revisión', () => {
        expect(calcularEstadoManzana({ ...base, ultimaLimpiezaEn: ahora, tienePendientes: true }, ahora)).toBe('AMARILLO');
    });
});

describe('ciclo de vida del reporte', () => {
    it('no permite reabrir un reporte resuelto ni resolver una limpieza', () => {
        expect(esTransicionValida('RESUELTO', 'VALIDADO', 'CRIADERO')).toBe(false);
        expect(esTransicionValida('VALIDADO', 'RESUELTO', 'LIMPIEZA')).toBe(false);
        expect(esTransicionValida('VALIDADO', 'RESUELTO', 'CRIADERO')).toBe(true);
        expect(esTransicionValida('PENDIENTE', 'RECHAZADO', 'MICROBASURAL')).toBe(true);
    });
});

describe('RBAC', () => {
    it('solo ADMINISTRADOR gestiona usuarios', () => {
        const roles = Object.entries(PERMISOS_POR_ROL)
            .filter(([, permisos]) => permisos.includes(PERMISOS.USUARIOS_GESTIONAR))
            .map(([rol]) => rol);
        expect(roles).toEqual(['ADMINISTRADOR']);
    });

    it('BRIGADISTA y AUDITOR no exportan ni validan', () => {
        for (const rol of ['BRIGADISTA', 'AUDITOR'] as const) {
            expect(tienePermiso(rol, PERMISOS.EXPORTACIONES_DESCARGAR)).toBe(false);
            expect(tienePermiso(rol, PERMISOS.REPORTES_VALIDAR)).toBe(false);
        }
    });

    it('AUDITOR no ve fotos de evidencia', () => {
        expect(tienePermiso('AUDITOR', PERMISOS.EVIDENCIAS_VER)).toBe(false);
    });

    it('un rol local queda siempre en su localidad', () => {
        const coordinador = { id: 1, rol: 'COORDINADOR_BRIGADA' as const, localidadId: 3 };
        expect(alcanceLocalidad(coordinador)).toBe(3);
        expect(() => alcanceLocalidad(coordinador, 4)).toThrow(ErrorHttp);
        expect(() => alcanceLocalidad({ ...coordinador, localidadId: null })).toThrow(ErrorHttp);
    });

    it('un rol provincial puede consultar toda la provincia o filtrar', () => {
        const epidemiologo = { id: 2, rol: 'EPIDEMIOLOGO' as const, localidadId: null };
        expect(alcanceLocalidad(epidemiologo)).toBeNull();
        expect(alcanceLocalidad(epidemiologo, 5)).toBe(5);
    });
});

describe('escaparCsv', () => {
    it('neutraliza fórmulas de planillas de cálculo', () => {
        expect(escaparCsv('=HYPERLINK("http://malicioso")')).toBe(`"'=HYPERLINK(""http://malicioso"")"`);
        expect(escaparCsv('+54 370')).toBe("'+54 370");
    });

    it('entrecomilla el punto y coma y detecta fórmulas con espacios adelante', () => {
        expect(escaparCsv('tanque;=HYPERLINK("http://x")')).toBe('"tanque;=HYPERLINK(""http://x"")"');
        expect(escaparCsv('  =1+1')).toBe("'  =1+1");
    });

    it('respeta números negativos y comillas', () => {
        expect(escaparCsv(-26.19)).toBe('-26.19');
        expect(escaparCsv('texto, con "comillas"')).toBe('"texto, con ""comillas"""');
        expect(escaparCsv(null)).toBe('');
    });
});

describe('endpoints Web Push permitidos', async () => {
    const { esEndpointPushPermitido } = await import('../validators/suscripcion.validators.js');

    it('acepta los servicios push de los navegadores', () => {
        expect(esEndpointPushPermitido('https://fcm.googleapis.com/fcm/send/abc')).toBe(true);
        expect(esEndpointPushPermitido('https://updates.push.services.mozilla.com/wpush/v2/abc')).toBe(true);
        expect(esEndpointPushPermitido('https://db5p.notify.windows.com/w/?token=abc')).toBe(true);
        expect(esEndpointPushPermitido('https://web.push.apple.com/abc')).toBe(true);
    });

    it('rechaza IPs, puertos, otros dominios y trucos con el nombre del host', () => {
        expect(esEndpointPushPermitido('https://10.0.0.5/push')).toBe(false);
        expect(esEndpointPushPermitido('https://fcm.googleapis.com:8443/x')).toBe(false);
        expect(esEndpointPushPermitido('http://fcm.googleapis.com/x')).toBe(false);
        expect(esEndpointPushPermitido('https://fcm.googleapis.com.atacante.com/x')).toBe(false);
        expect(esEndpointPushPermitido('https://usuario@fcm.googleapis.com/x')).toBe(false);
        expect(esEndpointPushPermitido('https://notify.windows.com.atacante.net/x')).toBe(false);
    });
});
