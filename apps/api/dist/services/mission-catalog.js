import { demoMissions } from "../lib/seed-data.js";
export async function ensureMissionCatalog(prisma) {
    for (const mission of demoMissions) {
        await prisma.mission.upsert({
            where: { id: mission.id },
            create: {
                ...mission,
                outcomes: mission.outcomes
            },
            update: {
                title: mission.title,
                summary: mission.summary,
                category: mission.category,
                ageBand: mission.ageBand,
                durationMinutes: mission.durationMinutes,
                outcomes: mission.outcomes,
                status: mission.status,
                coverTone: mission.coverTone
            }
        });
    }
}
