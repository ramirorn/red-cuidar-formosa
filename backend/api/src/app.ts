import express, { type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { fileURLToPath } from "node:url";
import entorno, { esProduccion } from "./config/entorno.js";
import prisma from "./config/prisma.js";
import { limiteGeneral } from "./middlewares/limiteTasa.middleware.js";

// Rutas
import router from "./routes/index.js";

const app = express();

app.disable("x-powered-by");
app.set("trust proxy", entorno.CONFIAR_PROXY);

app.use(helmet());
app.use(cors({ origin: entorno.CORS_ORIGENES, credentials: true }));
app.use(limiteGeneral);
app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());

app.get("/api/salud", async (_req: Request, res: Response) => {
    try {
        await prisma.$queryRaw`SELECT 1`;
        res.status(200).json({ status: "success", data: { estado: "ok" } });
    } catch {
        res.status(503).json({ status: "error", message: "Base de datos no disponible" });
    }
});

// Contrato OpenAPI, publicado solo fuera de producción.
if (!esProduccion) {
    const rutaContrato = fileURLToPath(new URL("../openapi.yaml", import.meta.url));
    app.get("/api/documentacion/openapi.yaml", (_req: Request, res: Response) => {
        res.type("application/yaml").sendFile(rutaContrato);
    });
}

app.use("/api", router);

app.use((_req: Request, res: Response) => {
    res.status(404).json({
        status: "error",
        message: "Ruta no encontrada",
    });
});

// Último recurso: JSON mal formado, cuerpo demasiado grande o errores no controlados.
app.use((error: any, _req: Request, res: Response, _next: NextFunction) => {
    const estado = typeof error?.status === "number" && error.status >= 400 && error.status < 500 ? error.status : 500;

    if (estado === 500) console.error(error);

    res.status(estado).json({
        status: "error",
        message: estado === 500 ? "Error interno del servidor" : "La solicitud no es válida",
    });
});

if (process.env.NODE_ENV !== "test") {
    app.listen(entorno.PORT, () => {
        console.log(`Servidor corriendo en: http://localhost:${entorno.PORT}`);
    });
}

export default app;
