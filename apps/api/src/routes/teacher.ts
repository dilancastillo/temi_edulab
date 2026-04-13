import crypto from "node:crypto";
import { Prisma } from "@prisma/client";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { addDays, createMissionCode, createOpaqueToken, hashToken } from "../lib/auth.js";
import { buildMissionRuntime } from "../lib/runtime.js";
import { serializeClassSession, serializePairingRequest, serializeRobot } from "../lib/serializers.js";
import { requireTeacherSession, requireUserSession } from "../lib/session-auth.js";
import { buildBootstrap } from "../services/bootstrap.js";
import { config } from "../lib/config.js";

const studentSchema = z.object({
  fullName: z.string().trim().min(3).max(120),
  email: z.string().email().transform((value) => value.trim().toLowerCase()),
  courseId: z.string().min(1),
  avatarUrl: z.string().optional()
});

const importStudentsSchema = z.object({
  students: z.array(
    z.object({
      fullName: z.string().trim().min(3).max(120),
      email: z.string().email().transform((value) => value.trim().toLowerCase()),
      courseName: z.string().trim().min(1)
    })
  )
});

const assignmentSchema = z.object({
  missionId: z.string().min(1),
  courseId: z.string().min(1),
  instructions: z.string().trim().max(500).optional()
});

const profileSchema = z.object({
  fullName: z.string().trim().min(3).max(120),
  email: z.string().email().transform((value) => value.trim().toLowerCase()),
  biography: z.string().trim().min(10).max(500),
  avatarUrl: z.string().optional()
});

const studentWorkSchema = z.object({
  studentId: z.string().min(1),
  assignmentId: z.string().min(1),
  missionId: z.string().min(1),
  workspaceState: z.unknown().optional(),
  stepIndex: z.number().int().min(0).max(999)
});

const classSessionSchema = z.object({
  assignmentId: z.string().min(1),
  robotId: z.string().min(1),
  activeStudentName: z.string().trim().max(120).optional()
});

const pairingConfirmSchema = z.object({
  assignedName: z.string().trim().min(3).max(120),
  classroomName: z.string().trim().min(2).max(120),
  courseId: z.string().min(1)
});

function assertInstitutionMatch(app: FastifyInstance, firstInstitutionId: string | null | undefined, secondInstitutionId: string | null | undefined) {
  if (!firstInstitutionId || !secondInstitutionId || firstInstitutionId !== secondInstitutionId) {
    throw app.httpErrors.forbidden("El recurso no pertenece a la institucion activa.");
  }
}

export async function registerTeacherRoutes(app: FastifyInstance) {
  app.post("/v1/students", async (request) => {
    const teacher = await requireTeacherSession(app, request);
    const body = studentSchema.parse(request.body);

    const existingStudent = await app.prisma.user.findUnique({
      where: { email: body.email }
    });
    if (existingStudent) {
      throw app.httpErrors.conflict("Ya existe un usuario con ese correo.");
    }

    const course = await app.prisma.course.findUnique({
      where: { id: body.courseId }
    });
    assertInstitutionMatch(app, teacher.institutionId, course?.institutionId);

    await app.prisma.user.create({
      data: {
        id: `student-${crypto.randomUUID()}`,
        institutionId: teacher.institutionId,
        courseId: body.courseId,
        role: "STUDENT",
        authProvider: "PASSWORD",
        fullName: body.fullName,
        email: body.email,
        passwordHash: null,
        avatarUrl: body.avatarUrl,
        progress: "IN_PROGRESS"
      }
    });

    return buildBootstrap(app, teacher.id);
  });

  app.patch("/v1/students/:studentId", async (request) => {
    const teacher = await requireTeacherSession(app, request);
    const body = studentSchema.parse(request.body);
    const params = z.object({ studentId: z.string().min(1) }).parse(request.params);

    const student = await app.prisma.user.findUnique({
      where: { id: params.studentId }
    });
    assertInstitutionMatch(app, teacher.institutionId, student?.institutionId);

    const existingWithEmail = await app.prisma.user.findUnique({
      where: { email: body.email }
    });
    if (existingWithEmail && existingWithEmail.id !== params.studentId) {
      throw app.httpErrors.conflict("Ese correo ya esta asignado a otro usuario.");
    }

    await app.prisma.user.update({
      where: { id: params.studentId },
      data: {
        fullName: body.fullName,
        email: body.email,
        courseId: body.courseId,
        avatarUrl: body.avatarUrl
      }
    });

    return buildBootstrap(app, teacher.id);
  });

  app.delete("/v1/students/:studentId", async (request) => {
    const teacher = await requireTeacherSession(app, request);
    const params = z.object({ studentId: z.string().min(1) }).parse(request.params);

    const student = await app.prisma.user.findUnique({
      where: { id: params.studentId }
    });
    assertInstitutionMatch(app, teacher.institutionId, student?.institutionId);

    await app.prisma.user.delete({
      where: { id: params.studentId }
    });

    return buildBootstrap(app, teacher.id);
  });

  app.post("/v1/students/import", async (request) => {
    const teacher = await requireTeacherSession(app, request);
    const body = importStudentsSchema.parse(request.body);
    const existingEmails = new Set(
      (
        await app.prisma.user.findMany({
          where: { institutionId: teacher.institutionId },
          select: { email: true }
        })
      ).map((item) => item.email.toLowerCase())
    );
    const courses = await app.prisma.course.findMany({
      where: { institutionId: teacher.institutionId }
    });

    const skipped: string[] = [];
    let added = 0;

    for (const row of body.students) {
      const course = courses.find((candidate) => candidate.name.toLowerCase() === row.courseName.toLowerCase());
      if (!course) {
        skipped.push(`${row.fullName}: curso "${row.courseName}" no existe.`);
        continue;
      }

      if (existingEmails.has(row.email)) {
        skipped.push(`${row.fullName}: correo duplicado.`);
        continue;
      }

      existingEmails.add(row.email);
      added += 1;

      await app.prisma.user.create({
        data: {
          id: `student-${crypto.randomUUID()}`,
          institutionId: teacher.institutionId,
          courseId: course.id,
          role: "STUDENT",
          authProvider: "PASSWORD",
          fullName: row.fullName,
          email: row.email,
          passwordHash: null,
          progress: "IN_PROGRESS"
        }
      });
    }

    return {
      added,
      skipped,
      bootstrap: await buildBootstrap(app, teacher.id)
    };
  });

  app.post("/v1/assignments", async (request) => {
    const teacher = await requireTeacherSession(app, request);
    const body = assignmentSchema.parse(request.body);

    const [course, mission] = await Promise.all([
      app.prisma.course.findUnique({ where: { id: body.courseId } }),
      app.prisma.mission.findUnique({ where: { id: body.missionId } })
    ]);
    assertInstitutionMatch(app, teacher.institutionId, course?.institutionId);
    if (!mission) {
      throw app.httpErrors.notFound("No encontramos esa mision.");
    }

    await app.prisma.assignment.create({
      data: {
        id: `assignment-${crypto.randomUUID()}`,
        institutionId: teacher.institutionId!,
        courseId: body.courseId,
        missionId: body.missionId,
        missionCode: createMissionCode(),
        instructions: body.instructions,
        status: "ACTIVE",
        assignedAt: new Date(),
        assignedById: teacher.id
      }
    });

    await app.prisma.user.updateMany({
      where: { institutionId: teacher.institutionId, courseId: body.courseId, role: "STUDENT" },
      data: {
        currentMissionId: body.missionId,
        progress: "IN_PROGRESS"
      }
    });

    return buildBootstrap(app, teacher.id);
  });

  app.post("/v1/assignments/:assignmentId/archive", async (request) => {
    const teacher = await requireTeacherSession(app, request);
    const params = z.object({ assignmentId: z.string().min(1) }).parse(request.params);

    const assignment = await app.prisma.assignment.findUnique({
      where: { id: params.assignmentId }
    });
    assertInstitutionMatch(app, teacher.institutionId, assignment?.institutionId);

    await app.prisma.assignment.update({
      where: { id: params.assignmentId },
      data: { status: "ARCHIVED" }
    });

    return buildBootstrap(app, teacher.id);
  });

  app.delete("/v1/assignments/:assignmentId", async (request) => {
    const teacher = await requireTeacherSession(app, request);
    const params = z.object({ assignmentId: z.string().min(1) }).parse(request.params);

    const assignment = await app.prisma.assignment.findUnique({
      where: { id: params.assignmentId }
    });
    assertInstitutionMatch(app, teacher.institutionId, assignment?.institutionId);

    await app.prisma.assignment.delete({
      where: { id: params.assignmentId }
    });

    return buildBootstrap(app, teacher.id);
  });

  app.patch("/v1/profile", async (request) => {
    const user = await requireUserSession(app, request);
    const body = profileSchema.parse(request.body);

    await app.prisma.user.update({
      where: { id: user.id },
      data: {
        fullName: body.fullName,
        email: body.email,
        biography: body.biography,
        avatarUrl: body.avatarUrl
      }
    });

    return buildBootstrap(app, user.id);
  });

  app.post("/v1/student-work/save", async (request) => {
    const user = await requireUserSession(app, request);
    const body = studentWorkSchema.parse(request.body);
    if (user.role !== "STUDENT" || user.id !== body.studentId || !user.institutionId) {
      throw app.httpErrors.forbidden("Solo el estudiante dueno de la entrega puede guardar progreso.");
    }

    await app.prisma.studentWork.upsert({
      where: {
        studentId_assignmentId: {
          studentId: body.studentId,
          assignmentId: body.assignmentId
        }
      },
      create: {
        id: `work-${crypto.randomUUID()}`,
        institutionId: user.institutionId,
        studentId: body.studentId,
        assignmentId: body.assignmentId,
        missionId: body.missionId,
        workspaceState: body.workspaceState as Prisma.InputJsonValue | undefined,
        stepIndex: body.stepIndex,
        status: "DRAFT",
        updatedAt: new Date()
      },
      update: {
        workspaceState: body.workspaceState as Prisma.InputJsonValue | undefined,
        stepIndex: body.stepIndex,
        updatedAt: new Date()
      }
    });

    return buildBootstrap(app, user.id);
  });

  app.post("/v1/student-work/submit", async (request) => {
    const user = await requireUserSession(app, request);
    const body = studentWorkSchema.parse(request.body);
    if (user.role !== "STUDENT" || user.id !== body.studentId || !user.institutionId) {
      throw app.httpErrors.forbidden("Solo el estudiante dueno de la entrega puede enviar.");
    }

    const submittedAt = new Date();

    await app.prisma.studentWork.upsert({
      where: {
        studentId_assignmentId: {
          studentId: body.studentId,
          assignmentId: body.assignmentId
        }
      },
      create: {
        id: `work-${crypto.randomUUID()}`,
        institutionId: user.institutionId,
        studentId: body.studentId,
        assignmentId: body.assignmentId,
        missionId: body.missionId,
        workspaceState: body.workspaceState as Prisma.InputJsonValue | undefined,
        stepIndex: body.stepIndex,
        status: "SUBMITTED",
        updatedAt: submittedAt,
        submittedAt
      },
      update: {
        workspaceState: body.workspaceState as Prisma.InputJsonValue | undefined,
        stepIndex: body.stepIndex,
        status: "SUBMITTED",
        updatedAt: submittedAt,
        submittedAt
      }
    });

    await app.prisma.user.update({
      where: { id: body.studentId },
      data: {
        progress: "NEEDS_REVIEW",
        currentMissionId: body.missionId
      }
    });

    const reviewCount = await app.prisma.studentWork.count({
      where: {
        assignmentId: body.assignmentId,
        status: "SUBMITTED"
      }
    });

    await app.prisma.assignment.update({
      where: { id: body.assignmentId },
      data: {
        reviewCount
      }
    });

    return buildBootstrap(app, user.id);
  });

  app.get("/v1/robots", async (request) => {
    const teacher = await requireTeacherSession(app, request);
    const robots = await app.prisma.robot.findMany({
      where: { institutionId: teacher.institutionId! },
      orderBy: { displayName: "asc" }
    });

    return {
      robots: robots.map(serializeRobot)
    };
  });

  app.get("/v1/class-sessions", async (request) => {
    const teacher = await requireTeacherSession(app, request);
    const classSessions = await app.prisma.classSession.findMany({
      where: { institutionId: teacher.institutionId! },
      orderBy: { updatedAt: "desc" }
    });

    return {
      classSessions: classSessions.map(serializeClassSession)
    };
  });

  app.post("/v1/class-sessions", async (request) => {
    const teacher = await requireTeacherSession(app, request);
    const body = classSessionSchema.parse(request.body);

    const [assignment, robot] = await Promise.all([
      app.prisma.assignment.findUnique({ where: { id: body.assignmentId } }),
      app.prisma.robot.findUnique({ where: { id: body.robotId } })
    ]);

    assertInstitutionMatch(app, teacher.institutionId, assignment?.institutionId);
    assertInstitutionMatch(app, teacher.institutionId, robot?.institutionId);

    if (!assignment || !robot) {
      throw app.httpErrors.notFound("No encontramos la asignacion o el robot.");
    }

    const [mission, locations] = await Promise.all([
      app.prisma.mission.findUnique({ where: { id: assignment.missionId } }),
      app.prisma.robotLocation.findMany({ where: { robotId: robot.id } })
    ]);

    if (!mission) {
      throw app.httpErrors.notFound("La mision no existe.");
    }

    const runtime = buildMissionRuntime({
      assignment,
      mission,
      robot,
      teacher,
      activeStudentName: body.activeStudentName,
      locations
    });

    const classSession = await app.prisma.classSession.create({
      data: {
        id: `class-session-${crypto.randomUUID()}`,
        institutionId: teacher.institutionId!,
        robotId: robot.id,
        courseId: assignment.courseId,
        assignmentId: assignment.id,
        teacherId: teacher.id,
        classroomName: robot.classroomName ?? "Aula asignada",
        missionTitle: mission.title,
        activeStudentName: body.activeStudentName,
        status: "PENDING_APPROVAL",
        missionRuntime: runtime,
        currentStepLabel: "Esperando aprobacion del docente",
        progressPercent: 0
      }
    });

    return {
      classSession: serializeClassSession(classSession),
      bootstrap: await buildBootstrap(app, teacher.id)
    };
  });

  app.post("/v1/class-sessions/:classSessionId/approve", async (request) => {
    const teacher = await requireTeacherSession(app, request);
    const params = z.object({ classSessionId: z.string().min(1) }).parse(request.params);

    const classSession = await app.prisma.classSession.findUnique({
      where: { id: params.classSessionId }
    });
    assertInstitutionMatch(app, teacher.institutionId, classSession?.institutionId);

    const updated = await app.prisma.classSession.update({
      where: { id: params.classSessionId },
      data: {
        status: "READY",
        approvedAt: new Date(),
        currentStepLabel: "Runtime listo para el robot"
      }
    });

    return {
      classSession: serializeClassSession(updated),
      bootstrap: await buildBootstrap(app, teacher.id)
    };
  });

  app.get("/v1/pairing-requests", async (request) => {
    const teacher = await requireTeacherSession(app, request);
    const requests = await app.prisma.pairingRequest.findMany({
      where: {
        OR: [{ institutionId: null }, { institutionId: teacher.institutionId! }],
        expiresAt: { gt: new Date() }
      },
      orderBy: { createdAt: "desc" }
    });

    return {
      pairingRequests: requests.map(serializePairingRequest)
    };
  });

  app.post("/v1/pairing-requests/:pairingRequestId/confirm", async (request) => {
    const teacher = await requireTeacherSession(app, request);
    const params = z.object({ pairingRequestId: z.string().min(1) }).parse(request.params);
    const body = pairingConfirmSchema.parse(request.body);

    const pairingRequest = await app.prisma.pairingRequest.findUnique({
      where: { id: params.pairingRequestId }
    });

    if (!pairingRequest || pairingRequest.expiresAt <= new Date()) {
      throw app.httpErrors.notFound("La solicitud de vinculacion expiro o no existe.");
    }

    const course = await app.prisma.course.findUnique({
      where: { id: body.courseId }
    });
    assertInstitutionMatch(app, teacher.institutionId, course?.institutionId);

    const token = createOpaqueToken();
    const tokenExpiresAt = addDays(new Date(), config.robotTokenTtlDays);
    const robotId = pairingRequest.robotId ?? `robot-${crypto.randomUUID()}`;
    const slug = body.assignedName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");

    await app.prisma.robot.upsert({
      where: { id: robotId },
      create: {
        id: robotId,
        institutionId: teacher.institutionId!,
        courseId: body.courseId,
        displayName: body.assignedName,
        slug,
        classroomName: body.classroomName,
        pairCode: pairingRequest.code,
        pairCodeExpiresAt: pairingRequest.expiresAt,
        deviceTokenHash: hashToken(token),
        tokenExpiresAt,
        connectionState: "CHECKING",
        statusLabel: "Pendiente de sincronizacion"
      },
      update: {
        institutionId: teacher.institutionId!,
        courseId: body.courseId,
        displayName: body.assignedName,
        classroomName: body.classroomName,
        pairCode: pairingRequest.code,
        pairCodeExpiresAt: pairingRequest.expiresAt,
        deviceTokenHash: hashToken(token),
        tokenExpiresAt
      }
    });

    const updatedRequest = await app.prisma.pairingRequest.update({
      where: { id: params.pairingRequestId },
      data: {
        robotId,
        institutionId: teacher.institutionId!,
        confirmedById: teacher.id,
        status: "CONFIRMED",
        confirmedAt: new Date(),
        pendingDeviceToken: token
      }
    });

    return {
      pairingRequest: serializePairingRequest(updatedRequest),
      bootstrap: await buildBootstrap(app, teacher.id)
    };
  });
}
