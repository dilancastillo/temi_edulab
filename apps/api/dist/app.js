import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import sensible from "@fastify/sensible";
import { Prisma } from "@prisma/client";
import Fastify from "fastify";
import { ZodError } from "zod";
import { config } from "./lib/config.js";
import { prismaPlugin } from "./plugins/prisma.js";
import { registerAuthRoutes } from "./routes/auth.js";
import { registerInstitutionRoutes } from "./routes/institution.js";
import { registerTeacherRoutes } from "./routes/teacher.js";
import { registerRobotRoutes } from "./routes/robot.js";
import { ensureMissionCatalog } from "./services/mission-catalog.js";
export async function buildApp() {
    const app = Fastify({
        logger: true
    });
    await app.register(cors, {
        origin: (origin, callback) => {
            if (!origin || config.webOrigins.includes(origin)) {
                callback(null, true);
                return;
            }
            callback(new Error("Origen no permitido"), false);
        }
    });
    await app.register(rateLimit, {
        max: 120,
        timeWindow: "1 minute"
    });
    await app.register(sensible);
    await app.register(prismaPlugin);
    await ensureMissionCatalog(app.prisma);
    app.setErrorHandler((error, _request, reply) => {
        if (error instanceof ZodError) {
            reply.status(400).send({
                message: "Revisa los datos enviados.",
                issues: error.issues
            });
            return;
        }
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === "P2002") {
                reply.status(409).send({
                    message: "Ya existe un registro con ese valor. Prueba con otro nombre o reutiliza el robot existente."
                });
                return;
            }
        }
        if (typeof error === "object" && error !== null && "statusCode" in error && typeof error.statusCode === "number") {
            const httpError = error;
            reply.status(httpError.statusCode).send({
                message: httpError.message ?? "No pudimos procesar la solicitud."
            });
            return;
        }
        app.log.error(error);
        reply.status(500).send({
            message: "Ocurrio un error inesperado."
        });
    });
    await registerAuthRoutes(app);
    await registerInstitutionRoutes(app);
    await registerTeacherRoutes(app);
    await registerRobotRoutes(app);
    app.get("/health", async () => ({ ok: true }));
    return app;
}
