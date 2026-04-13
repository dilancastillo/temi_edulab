import type { FastifyInstance, FastifyRequest } from "fastify";
import type { User } from "@prisma/client";
import { hashToken } from "./auth.js";

function readBearerToken(request: FastifyRequest) {
  const rawHeader = request.headers.authorization;
  if (!rawHeader?.startsWith("Bearer ")) return null;
  return rawHeader.slice("Bearer ".length).trim();
}

export async function requireUserSession(app: FastifyInstance, request: FastifyRequest) {
  const token = readBearerToken(request);
  if (!token) {
    throw app.httpErrors.unauthorized("Hace falta iniciar sesion.");
  }

  const tokenHash = hashToken(token);
  const session = await app.prisma.webSession.findUnique({
    where: { tokenHash },
    include: { user: true }
  });

  if (!session || session.expiresAt <= new Date()) {
    throw app.httpErrors.unauthorized("La sesion expiro o ya no existe.");
  }

  await app.prisma.webSession.update({
    where: { id: session.id },
    data: { lastSeenAt: new Date() }
  });

  return session.user;
}

export async function requireTeacherSession(app: FastifyInstance, request: FastifyRequest): Promise<User & { institutionId: string }> {
  const user = await requireUserSession(app, request);
  if (!["TEACHER", "INSTITUTION_ADMIN", "ADMIN"].includes(user.role)) {
    throw app.httpErrors.forbidden("No tienes permisos para esta accion.");
  }

  if (!user.institutionId) {
    throw app.httpErrors.forbidden("La cuenta no esta asociada a una institucion.");
  }

  return user as User & { institutionId: string };
}

export async function requireRobotSession(app: FastifyInstance, request: FastifyRequest) {
  const token = readBearerToken(request);
  if (!token) {
    throw app.httpErrors.unauthorized("Hace falta un token de robot.");
  }

  const robot = await app.prisma.robot.findUnique({
    where: { deviceTokenHash: hashToken(token) }
  });

  if (!robot || !robot.tokenExpiresAt || robot.tokenExpiresAt <= new Date()) {
    throw app.httpErrors.unauthorized("El token del robot expiro o no es valido.");
  }

  return robot;
}
