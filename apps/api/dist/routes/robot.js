import { z } from "zod";
import { addDays, createShortCode, normalizeLocation } from "../lib/auth.js";
import { materializeRobotMissionRuntime } from "../lib/runtime.js";
import { serializePairingRequest, serializeRobotLocation } from "../lib/serializers.js";
import { requireRobotSession } from "../lib/session-auth.js";
const pairingRequestSchema = z.object({
    proposedName: z.string().trim().min(3).max(120),
    classroomName: z.string().trim().max(120).optional(),
    sessionUri: z.string().trim().max(240).optional()
});
const locationsSyncSchema = z.object({
    locations: z.array(z.object({
        name: z.string().trim().min(1).max(120),
        available: z.boolean(),
        detail: z.string().trim().max(240).optional()
    }))
});
const heartbeatSchema = z.object({
    connectionState: z.string().trim().min(2).max(40),
    batteryPercent: z.number().int().min(0).max(100).optional(),
    statusLabel: z.string().trim().max(120).optional(),
    classSessionId: z.string().optional(),
    currentStepLabel: z.string().trim().max(160).optional(),
    progressPercent: z.number().int().min(0).max(100).optional()
});
const eventSchema = z.object({
    classSessionId: z.string().optional(),
    idempotencyKey: z.string().trim().min(8).max(160),
    eventType: z.string().trim().min(2).max(80),
    payload: z.record(z.string(), z.unknown()).or(z.array(z.unknown())).or(z.object({}).passthrough())
});
export async function registerRobotRoutes(app) {
    app.post("/v1/robot/pairing-requests", async (request) => {
        const body = pairingRequestSchema.parse(request.body);
        const code = createShortCode("EDU");
        const expiresAt = addDays(new Date(), 1);
        const pairingRequest = await app.prisma.pairingRequest.create({
            data: {
                code,
                proposedName: body.proposedName,
                classroomName: body.classroomName,
                sessionUri: body.sessionUri,
                expiresAt
            }
        });
        return {
            pairingRequest: serializePairingRequest(pairingRequest),
            qrPayload: JSON.stringify({
                pairingRequestId: pairingRequest.id,
                code,
                sessionUri: body.sessionUri
            })
        };
    });
    app.get("/v1/robot/pairing-requests/:pairingRequestId", async (request) => {
        const params = z.object({ pairingRequestId: z.string().min(1) }).parse(request.params);
        const pairingRequest = await app.prisma.pairingRequest.findUnique({
            where: { id: params.pairingRequestId }
        });
        if (!pairingRequest) {
            throw app.httpErrors.notFound("No encontramos esa solicitud de vinculacion.");
        }
        if (pairingRequest.expiresAt <= new Date() && pairingRequest.status === "PENDING") {
            const expired = await app.prisma.pairingRequest.update({
                where: { id: pairingRequest.id },
                data: { status: "EXPIRED" }
            });
            return {
                pairingRequest: serializePairingRequest(expired)
            };
        }
        if (pairingRequest.status === "CONFIRMED" && pairingRequest.pendingDeviceToken) {
            const consumed = await app.prisma.pairingRequest.update({
                where: { id: pairingRequest.id },
                data: {
                    status: "CONSUMED",
                    consumedAt: new Date(),
                    pendingDeviceToken: null
                }
            });
            return {
                pairingRequest: serializePairingRequest(consumed),
                robotToken: pairingRequest.pendingDeviceToken,
                robotId: pairingRequest.robotId
            };
        }
        return {
            pairingRequest: serializePairingRequest(pairingRequest)
        };
    });
    app.post("/v1/robot/locations/sync", async (request) => {
        const robot = await requireRobotSession(app, request);
        const body = locationsSyncSchema.parse(request.body);
        const now = new Date();
        await app.prisma.$transaction(async (tx) => {
            await tx.robotLocation.deleteMany({
                where: { robotId: robot.id }
            });
            if (body.locations.length > 0) {
                await tx.robotLocation.createMany({
                    data: body.locations.map((location) => ({
                        robotId: robot.id,
                        name: location.name,
                        normalizedName: normalizeLocation(location.name),
                        available: location.available,
                        detail: location.detail,
                        lastValidatedAt: now
                    }))
                });
            }
        });
        const locations = await app.prisma.robotLocation.findMany({
            where: { robotId: robot.id },
            orderBy: { name: "asc" }
        });
        return {
            locations: locations.map(serializeRobotLocation)
        };
    });
    app.post("/v1/robot/heartbeat", async (request) => {
        const robot = await requireRobotSession(app, request);
        const body = heartbeatSchema.parse(request.body);
        await app.prisma.robot.update({
            where: { id: robot.id },
            data: {
                connectionState: body.connectionState,
                batteryPercent: body.batteryPercent,
                statusLabel: body.statusLabel,
                lastSeenAt: new Date()
            }
        });
        if (body.classSessionId) {
            await app.prisma.classSession.updateMany({
                where: { id: body.classSessionId, robotId: robot.id },
                data: {
                    currentStepLabel: body.currentStepLabel,
                    progressPercent: body.progressPercent
                }
            });
        }
        return { ok: true };
    });
    app.get("/v1/robot/sessions/next", async (request) => {
        const robot = await requireRobotSession(app, request);
        const classSession = await app.prisma.classSession.findFirst({
            where: {
                robotId: robot.id,
                status: {
                    in: ["PENDING_APPROVAL", "READY", "RUNNING", "PAUSED", "ERROR", "SAFE_MODE"]
                }
            },
            orderBy: { createdAt: "desc" }
        });
        if (!classSession) {
            return {
                classSession: null
            };
        }
        const latestStudentWork = await app.prisma.studentWork.findFirst({
            where: {
                assignmentId: classSession.assignmentId,
                status: "SUBMITTED"
            },
            include: {
                student: {
                    select: {
                        fullName: true
                    }
                }
            },
            orderBy: [{ submittedAt: "desc" }, { updatedAt: "desc" }]
        });
        const missionRuntime = materializeRobotMissionRuntime({
            missionRuntime: classSession.missionRuntime,
            workspaceState: latestStudentWork?.workspaceState,
            activeStudentName: classSession.activeStudentName ?? latestStudentWork?.student.fullName ?? null
        });
        return {
            classSession: {
                id: classSession.id,
                status: classSession.status.toLowerCase(),
                missionRuntime,
                missionTitle: classSession.missionTitle,
                activeStudentName: classSession.activeStudentName ?? latestStudentWork?.student.fullName ?? undefined,
                currentStepLabel: classSession.currentStepLabel,
                progressPercent: classSession.progressPercent,
                approvedAt: classSession.approvedAt?.toISOString()
            }
        };
    });
    app.post("/v1/robot/events", async (request) => {
        const robot = await requireRobotSession(app, request);
        const body = eventSchema.parse(request.body);
        const existing = await app.prisma.robotEvent.findUnique({
            where: { idempotencyKey: body.idempotencyKey }
        });
        if (existing) {
            return { ok: true, duplicate: true };
        }
        await app.prisma.robotEvent.create({
            data: {
                robotId: robot.id,
                classSessionId: body.classSessionId,
                idempotencyKey: body.idempotencyKey,
                eventType: body.eventType,
                payload: body.payload
            }
        });
        if (body.classSessionId) {
            const status = body.eventType === "SAFE_MODE"
                ? "SAFE_MODE"
                : body.eventType === "ERROR"
                    ? "ERROR"
                    : body.eventType === "COMPLETED"
                        ? "COMPLETED"
                        : body.eventType === "PAUSED"
                            ? "PAUSED"
                            : "RUNNING";
            await app.prisma.classSession.updateMany({
                where: {
                    id: body.classSessionId,
                    robotId: robot.id
                },
                data: {
                    status,
                    currentStepLabel: typeof body.payload === "object" && body.payload !== null && "currentStepLabel" in body.payload
                        ? String(body.payload.currentStepLabel)
                        : undefined,
                    progressPercent: typeof body.payload === "object" && body.payload !== null && "progressPercent" in body.payload
                        ? Number(body.payload.progressPercent)
                        : undefined,
                    completedAt: body.eventType === "COMPLETED" ? new Date() : undefined
                }
            });
        }
        return { ok: true };
    });
}
