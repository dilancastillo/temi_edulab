import bcrypt from "bcryptjs";
import { Prisma, PrismaClient } from "@prisma/client";
import {
  demoAssignments,
  demoCourses,
  demoInstitution,
  demoMissions,
  demoRobot,
  demoRobotLocations,
  demoStudentWorks,
  demoUsers
} from "../src/lib/seed-data.js";

const prisma = new PrismaClient();

async function main() {
  const teacherPasswordHash = await bcrypt.hash("demo2026", 10);
  const studentPasswordHash = await bcrypt.hash("estudiante2026", 10);
  const adminPasswordHash = await bcrypt.hash("admin2026", 10);

  await prisma.robotEvent.deleteMany();
  await prisma.classSession.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.robotMaintenanceRecord.deleteMany();
  await prisma.institutionReportSnapshot.deleteMany();
  await prisma.institutionTemplate.deleteMany();
  await prisma.policyAcceptance.deleteMany();
  await prisma.institutionPolicy.deleteMany();
  await prisma.institutionBranding.deleteMany();
  await prisma.institutionLicense.deleteMany();
  await prisma.learningSpace.deleteMany();
  await prisma.buildingFloor.deleteMany();
  await prisma.campus.deleteMany();
  await prisma.robotLocation.deleteMany();
  await prisma.pairingRequest.deleteMany();
  await prisma.webSession.deleteMany();
  await prisma.studentWork.deleteMany();
  await prisma.assignment.deleteMany();
  await prisma.mission.deleteMany();
  await prisma.robot.deleteMany();
  await prisma.user.deleteMany();
  await prisma.course.deleteMany();
  await prisma.institution.deleteMany();

  await prisma.institution.create({
    data: {
      ...demoInstitution,
      legalName: "Colegio Esbot EduLab S.A.S.",
      daneCode: "150001000001",
      department: "Boyaca",
      city: "Tunja",
      enabledLevels: ["PREESCOLAR", "BASICA_PRIMARIA", "BASICA_SECUNDARIA", "MEDIA"] as Prisma.InputJsonValue,
      marketingConsentEnabled: true
    }
  });

  await prisma.campus.create({
    data: {
      id: "campus-principal",
      institutionId: demoInstitution.id,
      name: "Sede Principal",
      city: "Tunja",
      address: "Carrera 10 # 20-30",
      phone: "(608) 740 0000"
    }
  });

  await prisma.buildingFloor.createMany({
    data: [
      {
        id: "floor-principal-1",
        institutionId: demoInstitution.id,
        campusId: "campus-principal",
        name: "Piso 1",
        levelNumber: 1
      },
      {
        id: "floor-principal-2",
        institutionId: demoInstitution.id,
        campusId: "campus-principal",
        name: "Piso 2",
        levelNumber: 2
      }
    ]
  });

  await prisma.learningSpace.createMany({
    data: [
      {
        id: "space-aula-5a",
        institutionId: demoInstitution.id,
        campusId: "campus-principal",
        floorId: "floor-principal-1",
        name: "Aula 5A",
        kind: "CLASSROOM",
        capacity: 32,
        safetyNotes: "Mantener pasillos despejados antes de ejecutar misiones.",
        accessibilityNotes: "Acceso directo desde pasillo principal.",
        isRobotReady: true
      },
      {
        id: "space-biblioteca",
        institutionId: demoInstitution.id,
        campusId: "campus-principal",
        floorId: "floor-principal-1",
        name: "Biblioteca de aula",
        kind: "LIBRARY",
        capacity: 20,
        safetyNotes: "Evitar sillas sueltas en la ruta del robot.",
        accessibilityNotes: "Espacio amplio para giro de Temi.",
        isRobotReady: true
      },
      {
        id: "space-lab",
        institutionId: demoInstitution.id,
        campusId: "campus-principal",
        floorId: "floor-principal-2",
        name: "Laboratorio STEAM",
        kind: "LAB",
        capacity: 28,
        safetyNotes: "Revisar cables y mesas moviles.",
        accessibilityNotes: "Validar ruta antes del taller.",
        isRobotReady: true
      }
    ]
  });

  await prisma.course.createMany({
    data: demoCourses.map((course) => ({
      ...course,
      campusId: "campus-principal",
      academicLevel: course.level === "10" || course.level === "11" ? "MEDIA" : "BASICA_PRIMARIA",
      gradeLabel: course.name.split(" ")[0] ?? course.level,
      groupLabel: course.name.split(" ")[1] ?? "A",
      academicYear: "2026"
    }))
  });

  await prisma.user.createMany({
    data: [
      {
        ...demoUsers.teacher,
        authProvider: "PASSWORD",
        passwordHash: teacherPasswordHash
      },
      {
        ...demoUsers.institutionAdmin,
        authProvider: "PASSWORD",
        passwordHash: adminPasswordHash
      },
      ...demoUsers.students.map((student) => ({
        ...student,
        role: "STUDENT" as const,
        authProvider: "PASSWORD" as const,
        passwordHash: studentPasswordHash,
        biography: null,
        avatarUrl: null
      }))
    ]
  });

  await prisma.mission.createMany({
    data: demoMissions.map((mission) => ({ ...mission, outcomes: mission.outcomes as Prisma.InputJsonValue }))
  });

  await prisma.assignment.createMany({
    data: demoAssignments.map((assignment) => ({
      ...assignment,
      instructions: null,
      assignedAt: new Date(assignment.assignedAt)
    }))
  });

  await prisma.studentWork.createMany({
    data: demoStudentWorks.map((work) => ({
      ...work,
      workspaceState: null,
      updatedAt: new Date(work.updatedAt),
      submittedAt: work.submittedAt ? new Date(work.submittedAt) : null
    }))
  });

  await prisma.robot.create({
    data: {
      ...demoRobot,
      campusId: "campus-principal",
      floorId: "floor-principal-1",
      spaceId: "space-aula-5a",
      serialNumber: "TEMI-V3-DEMO-5A",
      modelName: "Temi V3",
      firmwareVersion: "Launcher 136",
      sdkVersion: "1.137.1",
      maintenanceStatus: "Al dia",
      pairCodeExpiresAt: new Date("2026-04-12T19:00:00.000Z"),
      tokenExpiresAt: null,
      lastSeenAt: new Date(demoRobot.lastSeenAt)
    }
  });

  await prisma.robotLocation.createMany({
    data: demoRobotLocations.map((location) => ({
      robotId: demoRobot.id,
      name: location.name,
      normalizedName: location.name.trim().toLowerCase(),
      available: location.available,
      detail: location.detail,
      lastValidatedAt: new Date("2026-04-11T19:00:00.000Z")
    }))
  });

  await prisma.institutionLicense.create({
    data: {
      institutionId: demoInstitution.id,
      name: "Piloto institucional STEAM",
      status: "TRIAL",
      startsAt: new Date("2026-04-01T00:00:00.000Z"),
      endsAt: new Date("2026-12-31T23:59:59.000Z"),
      maxRobots: 3,
      maxTeachers: 25,
      maxStudents: 600,
      maxMissions: 20,
      trialMode: true,
      notes: "Licencia piloto para validacion en aula."
    }
  });

  await prisma.institutionBranding.create({
    data: {
      institutionId: demoInstitution.id,
      primaryColor: "#2856a6",
      accentColor: "#1f9d55",
      neutralColor: "#f4f7fb",
      marketingHeadline: "Robotica educativa para aprender creando",
      welcomeMessage: "Bienvenidos a una experiencia STEAM con Temi.",
      reportFooter: "Reporte generado por Esbot EduLab para uso institucional."
    }
  });

  await prisma.institutionPolicy.createMany({
    data: [
      {
        id: "policy-data-processing-v1",
        institutionId: demoInstitution.id,
        kind: "DATA_PROCESSING",
        title: "Politica de tratamiento de datos personales",
        version: "2026.1",
        status: "PUBLISHED",
        content:
          "Plantilla institucional basada en Ley 1581 de 2012. Define finalidades educativas, acceso restringido, seguridad, confidencialidad, derechos del titular y canales de atencion.",
        sourceReference: "Ley 1581 de 2012; Decreto 1074 de 2015; lineamientos SIC",
        effectiveAt: new Date("2026-04-01T00:00:00.000Z")
      },
      {
        id: "policy-robot-use-v1",
        institutionId: demoInstitution.id,
        kind: "ROBOT_USE",
        title: "Politica de uso seguro del robot Temi",
        version: "2026.1",
        status: "PUBLISHED",
        content:
          "Define preparacion del aula, supervision docente, rutas despejadas, modo seguro, autorizaciones operativas y reporte de incidentes.",
        sourceReference: "Politica operativa Esbot EduLab",
        effectiveAt: new Date("2026-04-01T00:00:00.000Z")
      }
    ]
  });

  await prisma.institutionTemplate.createMany({
    data: [
      {
        institutionId: demoInstitution.id,
        kind: "WORKSHOP_GUIDE",
        name: "Guia de taller Temi guia mi salon",
        status: "APPROVED",
        content:
          "Taller {nombre_taller} para {curso}. Incluye preparacion del aula, roles de equipo, reto central y cierre reflexivo.",
        variables: ["nombre_taller", "curso", "docente", "fecha"] as Prisma.InputJsonValue,
        requiresApproval: true,
        approvedAt: new Date("2026-04-01T00:00:00.000Z"),
        approvedById: demoUsers.institutionAdmin.id
      },
      {
        institutionId: demoInstitution.id,
        kind: "REPORT",
        name: "Reporte institucional STEAM",
        status: "APPROVED",
        content:
          "Reporte para {institucion}: uso por sede, docente, robot, curso, evidencias de taller y recomendaciones.",
        variables: ["institucion", "rango_fechas", "sede", "curso"] as Prisma.InputJsonValue,
        requiresApproval: true,
        approvedAt: new Date("2026-04-01T00:00:00.000Z"),
        approvedById: demoUsers.institutionAdmin.id
      }
    ]
  });

  await prisma.institutionReportSnapshot.create({
    data: {
      institutionId: demoInstitution.id,
      kind: "EXECUTIVE",
      title: "Resumen piloto institucional",
      rangeStart: new Date("2026-04-01T00:00:00.000Z"),
      rangeEnd: new Date("2026-04-30T23:59:59.000Z"),
      metrics: {
        activeTeachers: 1,
        activeStudents: 8,
        activeRobots: 1,
        completedMissions: 1,
        robotEvents: 0
      } as Prisma.InputJsonValue
    }
  });

  await prisma.robotMaintenanceRecord.create({
    data: {
      institutionId: demoInstitution.id,
      robotId: demoRobot.id,
      kind: "Preventivo",
      status: "Programado",
      notes: "Revisar bateria, sensores, mapa y conexion antes del piloto.",
      dueAt: new Date("2026-05-15T14:00:00.000Z")
    }
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
