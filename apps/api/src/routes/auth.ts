import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { addHours, createOpaqueToken, hashToken, verifyPassword } from "../lib/auth.js";
import { serializeSession } from "../lib/serializers.js";
import { requireUserSession } from "../lib/session-auth.js";
import { buildBootstrap } from "../services/bootstrap.js";
import { config } from "../lib/config.js";

const loginSchema = z.object({
  email: z.string().email().transform((value) => value.trim().toLowerCase()),
  password: z.string().min(8)
});

const studentLoginSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("password"),
    email: z.string().email().transform((value) => value.trim().toLowerCase()),
    password: z.string().min(8)
  }),
  z.object({
    mode: z.literal("mission_code"),
    email: z.string().email().transform((value) => value.trim().toLowerCase()),
    missionCode: z.string().min(4).max(12).transform((value) => value.trim().toUpperCase())
  })
]);

async function issueWebSession(app: FastifyInstance, userId: string) {
  const token = createOpaqueToken();
  const expiresAt = addHours(new Date(), config.sessionTtlHours);

  await app.prisma.webSession.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt
    }
  });

  return token;
}

export async function registerAuthRoutes(app: FastifyInstance) {
  app.post("/v1/auth/login", async (request) => {
    const body = loginSchema.parse(request.body);
    const user = await app.prisma.user.findUnique({
      where: { email: body.email }
    });

    if (!user || !["TEACHER", "INSTITUTION_ADMIN", "ADMIN"].includes(user.role)) {
      throw app.httpErrors.unauthorized("No encontramos una cuenta docente con ese correo.");
    }

    const passwordOk = await verifyPassword(body.password, user.passwordHash);
    if (!passwordOk) {
      throw app.httpErrors.unauthorized("La contrasena no coincide.");
    }

    const token = await issueWebSession(app, user.id);

    return {
      token,
      session: serializeSession(user, "password")
    };
  });

  app.post("/v1/auth/student-login", async (request) => {
    const body = studentLoginSchema.parse(request.body);
    const user = await app.prisma.user.findUnique({
      where: { email: body.email }
    });

    if (!user || user.role !== "STUDENT") {
      throw app.httpErrors.unauthorized("No encontramos un estudiante con ese correo.");
    }

    if (body.mode === "password") {
      const passwordOk = await verifyPassword(body.password, user.passwordHash);
      if (!passwordOk) {
        throw app.httpErrors.unauthorized("La contrasena no coincide.");
      }

      const token = await issueWebSession(app, user.id);
      return {
        token,
        session: serializeSession(user, "password")
      };
    }

    const assignment = await app.prisma.assignment.findFirst({
      where: {
        courseId: user.courseId ?? undefined,
        missionCode: body.missionCode,
        status: "ACTIVE"
      }
    });

    if (!assignment) {
      throw app.httpErrors.unauthorized("El codigo no coincide con una mision activa para ese estudiante.");
    }

    const token = await issueWebSession(app, user.id);
    return {
      token,
      session: serializeSession(user, "mission_code")
    };
  });

  app.post("/v1/auth/logout", async (request) => {
    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      const tokenHash = hashToken(authHeader.slice("Bearer ".length).trim());
      await app.prisma.webSession.deleteMany({
        where: { tokenHash }
      });
    }

    return { ok: true };
  });

  app.get("/v1/bootstrap", async (request) => {
    const user = await requireUserSession(app, request);
    return buildBootstrap(app, user.id);
  });
}
