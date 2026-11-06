import { demoMissions } from "@/lib/demo-data";
import type { Mission } from "@/lib/types";

/**
 * Misiones base editables.
 *
 * Las misiones base viven en el código y son iguales para todos. Cuando un docente edita
 * una, se guarda en la base de datos una copia suya con id "<idBase>~<idDocente>". Al cargar,
 * esa copia reemplaza a la misión base solo para ese docente y sus estudiantes, conservando
 * el id base para que las asignaciones existentes sigan funcionando. Si el docente borra su
 * copia, vuelve a ver la misión original.
 */

const SEPARATOR = "~";

export function baseOverrideId(baseId: string, teacherId: string): string {
  return `${baseId}${SEPARATOR}${teacherId}`;
}

export function isBaseMission(missionId: string): boolean {
  return demoMissions.some((m) => m.id === missionId);
}

/** Misiones base (con las ediciones del docente aplicadas) seguidas de sus misiones propias. */
export function mergeWithBaseMissions(customMissions: Mission[]): Mission[] {
  const overrides = new Map<string, Mission>();
  const own: Mission[] = [];

  for (const mission of customMissions) {
    const base = demoMissions.find((b) => mission.id.startsWith(`${b.id}${SEPARATOR}`));
    if (base) {
      overrides.set(base.id, { ...mission, id: base.id, storageId: mission.id, baseMissionId: base.id });
    } else {
      own.push(mission);
    }
  }

  return [...demoMissions.map((base) => overrides.get(base.id) ?? base), ...own];
}

/** La misión base original (sin ediciones), para restaurarla. */
export function originalBaseMission(baseId: string): Mission | undefined {
  return demoMissions.find((m) => m.id === baseId);
}
