import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import sharp from 'sharp';
import request from 'supertest';
import type { Rol, TipoReporte } from '@prisma/client';
import app from '../../app.js';
import prisma from '../../config/prisma.js';

export { app, prisma };

const TABLAS = [
    'auditoriaAcceso', 'tokenRefresco', 'notificacionEnviada', 'prediccionRiesgo', 'registroMeteorologico',
    'intervencion', 'paradaRuta', 'rutaBrigada', 'historialEstadoManzana', 'deteccionIa', 'evidencia',
    'triajeChat', 'suscripcionPush', 'reporte', 'sesionAnonima', 'usuario', 'manzana', 'localidad',
];

// Lista fija de tablas (sin datos externos): es seguro armar la sentencia como texto.
export const limpiarBase = () =>
    prisma.$executeRawUnsafe(`TRUNCATE ${TABLAS.map((tabla) => `"${tabla}"`).join(', ')} RESTART IDENTITY CASCADE`);

// ---------------------------------------------------------------------------
// Territorio: dos localidades con una grilla de 3 x 3 manzanas cada una
// ---------------------------------------------------------------------------

const LADO = 0.001;
const ORIGENES = {
    capital: { nombre: 'Formosa Capital', longitud: -58.18, latitud: -26.19 },
    clorinda: { nombre: 'Clorinda', longitud: -57.72, latitud: -25.29 },
} as const;

export type NombreLocalidad = keyof typeof ORIGENES;

export interface Territorio {
    localidades: Record<NombreLocalidad, number>;
    manzanas: Record<string, number>;
}

export const crearTerritorio = async (): Promise<Territorio> => {
    const localidades = {} as Record<NombreLocalidad, number>;
    const manzanas: Record<string, number> = {};

    for (const [clave, origen] of Object.entries(ORIGENES) as [NombreLocalidad, (typeof ORIGENES)[NombreLocalidad]][]) {
        const localidad = await prisma.localidad.create({ data: { nombre: origen.nombre, nivelRiesgoBase: 'CRITICO' } });
        localidades[clave] = localidad.id;

        for (let fila = 0; fila < 3; fila++) {
            for (let columna = 0; columna < 3; columna++) {
                const x = origen.longitud + columna * LADO;
                const y = origen.latitud + fila * LADO;
                const codigo = `${clave}-${fila}${columna}`;
                const [manzana] = await prisma.$queryRaw<{ id: number }[]>`
                    INSERT INTO "manzana" ("localidadId", "codigo", "geom", "centroide", "updatedAt")
                    VALUES (${localidad.id}, ${codigo},
                        ST_MakeEnvelope(${x}::float8, ${y}::float8, ${x + LADO * 0.8}::float8, ${y + LADO * 0.8}::float8, 4326),
                        ST_SetSRID(ST_MakePoint(${x + LADO * 0.4}::float8, ${y + LADO * 0.4}::float8), 4326), now())
                    RETURNING "id"`;
                manzanas[codigo] = manzana!.id;
            }
        }
    }

    return { localidades, manzanas };
};

// Coordenadas del centro de una manzana de la grilla, por ejemplo puntoDe('capital-11').
export const puntoDe = (codigo: string) => {
    const [clave, posicion] = codigo.split('-') as [NombreLocalidad, string];
    const origen = ORIGENES[clave];
    return {
        latitud: origen.latitud + Number(posicion[0]) * LADO + LADO * 0.4,
        longitud: origen.longitud + Number(posicion[1]) * LADO + LADO * 0.4,
    };
};

// ---------------------------------------------------------------------------
// Personas
// ---------------------------------------------------------------------------

export const tokenDe = (usuarioId: number) => jwt.sign({}, process.env.JWT_SECRET as string, {
    subject: String(usuarioId), issuer: 'red-cuidar-formosa', audience: 'institucional', expiresIn: '10m',
});

let numeroUsuario = 0;

export const crearUsuario = async (rol: Rol, localidadId: number | null = null, password = 'ClaveDePrueba123') => {
    numeroUsuario++;
    const usuario = await prisma.usuario.create({
        data: {
            nombre: rol,
            apellido: `Prueba${numeroUsuario}`,
            email: `usuario${numeroUsuario}@pruebas.local`,
            password: await bcrypt.hash(password, 4),
            rol,
            localidadId,
        },
    });
    return { ...usuario, token: tokenDe(usuario.id), password };
};

export const crearSesion = async () => {
    const respuesta = await request(app).post('/api/sesiones').expect(201);
    return respuesta.body.data as { sesionId: string; token: string };
};

// ---------------------------------------------------------------------------
// Evidencia
// ---------------------------------------------------------------------------

// Cada llamada genera una imagen de píxeles aleatorios, por lo tanto con otro hash SHA-256.
// (Dos colores lisos parecidos pueden comprimirse a los mismos bytes JPEG.)
export const imagenUnica = async (): Promise<Buffer> =>
    sharp(randomBytes(160 * 120 * 3), { raw: { width: 160, height: 120, channels: 3 } }).jpeg().toBuffer();

export interface CamposReporte {
    idCliente?: string;
    tipo?: TipoReporte;
    latitud?: number;
    longitud?: number;
    capturadoEn?: string;
    confianzaIa?: number;
    reporteResueltoId?: string;
}

export const enviarReporte = async (token: string, campos: CamposReporte, imagenes?: Buffer[]) => {
    const datos = {
        idCliente: crypto.randomUUID(),
        tipo: 'CRIADERO',
        capturadoEn: new Date().toISOString(),
        ...campos,
    };

    let peticion = request(app).post('/api/reportes').set('Authorization', `Bearer ${token}`);
    for (const [campo, valor] of Object.entries(datos)) {
        if (valor !== undefined) peticion = peticion.field(campo, String(valor));
    }
    for (const imagen of imagenes ?? [await imagenUnica()]) {
        peticion = peticion.attach('imagenes', imagen, { filename: 'foto.jpg', contentType: 'image/jpeg' });
    }
    return peticion;
};

// Cuenta las consultas SQL que ejecuta una operación (detección de N+1).
type ClienteConEventos = { $on(evento: 'query', callback: () => void): void };
let consultas = 0;
(prisma as unknown as ClienteConEventos).$on('query', () => {
    consultas++;
});

export const contarConsultas = async (operacion: () => Promise<unknown>): Promise<number> => {
    const inicio = consultas;
    await operacion();
    return consultas - inicio;
};
