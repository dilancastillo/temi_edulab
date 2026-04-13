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
    data: demoInstitution
  });

  await prisma.course.createMany({
    data: demoCourses.map((course) => ({ ...course }))
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
