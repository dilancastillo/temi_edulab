import { Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import { demoMissions } from "../lib/seed-data.js";

export async function ensureMissionCatalog(prisma: PrismaClient) {
  for (const mission of demoMissions) {
    await prisma.mission.upsert({
      where: { id: mission.id },
      create: {
        ...mission,
        outcomes: mission.outcomes as Prisma.InputJsonValue
      },
      update: {
        title: mission.title,
        summary: mission.summary,
        category: mission.category,
        ageBand: mission.ageBand,
        durationMinutes: mission.durationMinutes,
        outcomes: mission.outcomes as Prisma.InputJsonValue,
        status: mission.status,
        coverTone: mission.coverTone
      }
    });
  }
}
