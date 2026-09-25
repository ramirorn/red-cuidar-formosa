import { PrismaClient } from '@prisma/client';

// En las pruebas de integración se emite un evento por cada consulta SQL para detectar problemas N+1.
const prisma = new PrismaClient({
    log: process.env.PRISMA_REGISTRAR_CONSULTAS === 'true' ? [{ emit: 'event', level: 'query' }] : [],
});

export default prisma;
