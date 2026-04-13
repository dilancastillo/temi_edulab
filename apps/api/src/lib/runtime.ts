import type { Assignment, Mission, Robot, RobotLocation, User } from "@prisma/client";

export function buildMissionRuntime(input: {
  assignment: Assignment;
  mission: Mission;
  robot: Robot;
  teacher: User;
  activeStudentName?: string | null;
  locations: RobotLocation[];
}) {
  const targetLocation =
    input.locations.find((location) => location.available && location.normalizedName.includes("biblioteca")) ??
    input.locations.find((location) => location.available) ??
    null;

  return {
    id: `runtime-${input.assignment.id}`,
    assignmentId: input.assignment.id,
    missionId: input.mission.id,
    missionTitle: input.mission.title,
    missionCode: input.assignment.missionCode,
    classroom: input.robot.classroomName ?? "Aula asignada",
    teacherName: input.teacher.fullName,
    activeStudentName: input.activeStudentName ?? null,
    targetLocation: targetLocation?.name ?? null,
    steps: [
      {
        type: "TEACHER_APPROVAL",
        title: "Esperar aprobacion del docente",
        requiresTeacherApproval: true
      },
      {
        type: "SPEAK",
        title: "Presentacion",
        primaryValue: `Hola equipo. Soy ${input.robot.displayName} y vamos a iniciar ${input.mission.title}.`
      },
      {
        type: "NAVIGATE",
        title: "Ir a ubicacion",
        primaryValue: targetLocation?.name ?? null
      },
      {
        type: "WAIT_FOR_CHOICE",
        title: "Pregunta al estudiante",
        primaryValue: "Que debo hacer ahora?",
        secondaryValue: "Selecciona la accion correcta para continuar la mision.",
        tertiaryValue: "Buscar libro verde",
        options: ["Saludar", "Buscar libro verde", "Volver al salon"]
      },
      {
        type: "SPEAK",
        title: "Cierre y revision",
        primaryValue: "Mision lista. Necesito que el docente revise este programa antes de continuar."
      },
      {
        type: "COMPLETE",
        title: "Completar mision"
      }
    ]
  };
}
