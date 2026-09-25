import type { PrismaClient } from "@prisma/client";

// Asigna a cada manzana de la localidad la zona de la Copa que contiene su centro.
// Las manzanas que no caen en ninguna zona quedan sin zona (no compiten).
export const asignarZonasAManzanas = async (prisma: PrismaClient, localidadId: number): Promise<number> => {
    await prisma.$executeRaw`UPDATE "manzana" SET "zonaId" = NULL WHERE "localidadId" = ${localidadId}`;
    return prisma.$executeRaw`
        UPDATE "manzana" m
        SET "zonaId" = z."id"
        FROM "zonaCompetencia" z
        WHERE m."localidadId" = ${localidadId}
          AND z."localidadId" = ${localidadId}
          AND ST_Contains(z."geom", m."centroide")
    `;
};
