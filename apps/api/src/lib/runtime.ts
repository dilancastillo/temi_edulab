import type { Assignment, Mission, Robot, RobotLocation, User } from "@prisma/client";

export type WorkshopParticipationMode = "individual" | "teams";
export type WorkshopDeviceMode = "student_device" | "team_device" | "teacher_demo";
export type WorkshopExecutionMode = "normal" | "demo_safe";
export type WorkshopStudentMode = "guided" | "advanced";
export type WorkshopMessageMode = "template" | "custom";
export type WorkshopIconKey = "board" | "books" | "star" | "paint" | "microscope" | "trophy";

export type WorkshopCheckpoint = {
  locationName: string;
  alias: string;
  iconKey: WorkshopIconKey;
  messageMode: WorkshopMessageMode;
  messageText: string;
};

export type WorkshopChecklist = {
  robotConnected: boolean;
  batteryReady: boolean;
  mapReady: boolean;
  checkpointsReady: boolean;
  baseReady: boolean;
  routeSafeConfirmed: boolean;
  executionModeConfirmed: boolean;
};

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
    type: "generic",
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

export function buildClassroomGuideRuntime(input: {
  assignment: Assignment;
  mission: Mission;
  robot: Robot;
  teacher: User;
  courseName: string;
  workshopName: string;
  studentMode: WorkshopStudentMode;
  participationMode: WorkshopParticipationMode;
  deviceMode: WorkshopDeviceMode;
  executionMode: WorkshopExecutionMode;
  turnDurationMinutes: number;
  baseLocationName: string;
  checkpoints: WorkshopCheckpoint[];
  checklist: WorkshopChecklist;
}) {
  const [firstCheckpoint, secondCheckpoint, thirdCheckpoint] = input.checkpoints;
  if (!firstCheckpoint || !secondCheckpoint || !thirdCheckpoint) {
    throw new Error("La mision Temi guia mi salon necesita exactamente tres ubicaciones configuradas.");
  }

  return {
    id: `runtime-${input.assignment.id}`,
    type: "classroom_guide",
    assignmentId: input.assignment.id,
    missionId: input.mission.id,
    missionTitle: input.mission.title,
    missionCode: input.assignment.missionCode,
    workshopName: input.workshopName,
    studentMode: input.studentMode,
    classroom: input.robot.classroomName ?? "Aula asignada",
    courseName: input.courseName,
    teacherName: input.teacher.fullName,
    robotName: input.robot.displayName,
    participationMode: input.participationMode,
    deviceMode: input.deviceMode,
    executionMode: input.executionMode,
    turnDurationMinutes: input.turnDurationMinutes,
    baseLocationName: input.baseLocationName,
    checklist: input.checklist,
    checkpoints: input.checkpoints,
    steps: [
      {
        type: "TEACHER_APPROVAL",
        title: "Esperar aprobacion del docente",
        requiresTeacherApproval: true
      },
      {
        type: "SPEAK",
        title: "Saludo inicial",
        primaryValue: "Hola equipo. Soy Temi y hoy voy a guiar nuestro salon."
      },
      createCheckpointNavigationStep(firstCheckpoint, 1, input.executionMode),
      createCheckpointSpeechStep(firstCheckpoint, 1),
      createCheckpointNavigationStep(secondCheckpoint, 2, input.executionMode),
      createCheckpointSpeechStep(secondCheckpoint, 2),
      createCheckpointNavigationStep(thirdCheckpoint, 3, input.executionMode),
      createCheckpointSpeechStep(thirdCheckpoint, 3),
      {
        type: "SPEAK",
        title: "Despedida",
        primaryValue: "Gracias por este recorrido. Ahora voy a volver al punto base para el siguiente turno."
      },
      {
        type: "NAVIGATE",
        title: "Volver al punto base",
        primaryValue: input.baseLocationName,
        secondaryValue: input.executionMode
      },
      {
        type: "COMPLETE",
        title: "Completar mision"
      }
    ]
  };
}

export function materializeRobotMissionRuntime(input: {
  missionRuntime: unknown;
  workspaceState?: unknown;
  activeStudentName?: string | null;
}) {
  const baseRuntime = asRecord(input.missionRuntime);
  if (!baseRuntime || readString(baseRuntime.type) !== "classroom_guide" || !input.workspaceState) {
    return input.missionRuntime;
  }

  const checkpoints = readRuntimeCheckpoints(baseRuntime);
  if (checkpoints.length !== 3) {
    return input.missionRuntime;
  }

  const studentWorkspace = asRecord(input.workspaceState);
  if (!studentWorkspace || readString(studentWorkspace.missionType) !== "classroom_guide") {
    return input.missionRuntime;
  }

  const mode = readString(studentWorkspace.mode) === "advanced" ? "advanced" : "guided";
  const greetingText =
    (mode === "advanced"
      ? readString(asRecord(studentWorkspace.advancedDraft)?.greetingText)
      : readString(asRecord(studentWorkspace.greeting)?.text)) ?? null;
  const farewellText =
    (mode === "advanced"
      ? readString(asRecord(studentWorkspace.advancedDraft)?.farewellText)
      : readString(asRecord(studentWorkspace.farewell)?.text)) ?? null;

  if (mode === "guided") {
    const studentCheckpoints = Array.isArray(studentWorkspace.checkpoints) ? studentWorkspace.checkpoints : [];
    const mergedCheckpoints = checkpoints.map((checkpoint, index) => {
      const studentCheckpoint = asRecord(studentCheckpoints[index]);
      return {
        ...checkpoint,
        messageText: readString(studentCheckpoint?.studentMessage) ?? checkpoint.messageText
      };
    });

    return rebuildClassroomGuideRuntime(baseRuntime, {
      checkpoints: mergedCheckpoints,
      greetingText,
      farewellText,
      activeStudentName: input.activeStudentName ?? null,
      studentMode: mode
    });
  }

  const advancedDraft = asRecord(studentWorkspace.advancedDraft);
  const advancedStops = Array.isArray(advancedDraft?.stops)
    ? advancedDraft?.stops
        .map((value) => {
          const stop = asRecord(value);
          if (!stop) return null;

          const locationName = readString(stop.locationName);
          const alias = readString(stop.alias);
          const iconKey = readString(stop.iconKey);
          const messageText = readString(stop.messageText);
          if (!locationName || !alias || !iconKey || !messageText) {
            return null;
          }

          return {
            locationName,
            alias,
            iconKey,
            messageText
          };
        })
        .filter((value): value is NonNullable<typeof value> => value !== null)
    : [];

  const normalizedRuntimeLocations = new Map<string, RuntimeCheckpoint>(
    checkpoints.flatMap<[string, RuntimeCheckpoint]>((checkpoint) => {
      const entries: [string, RuntimeCheckpoint][] = [[normalizeText(checkpoint.locationName), checkpoint]];
      const aliasKey = normalizeText(checkpoint.alias);
      if (aliasKey && aliasKey !== normalizeText(checkpoint.locationName)) {
        entries.push([aliasKey, checkpoint]);
      }
      return entries;
    })
  );
  const resolvedStops: RuntimeCheckpoint[] = advancedStops
    .map((stop) => {
      const matched = normalizedRuntimeLocations.get(normalizeText(stop.locationName)) ?? normalizedRuntimeLocations.get(normalizeText(stop.alias));
      if (!matched) {
        return null;
      }

      return {
        locationName: matched.locationName,
        alias: stop.alias,
        iconKey: stop.iconKey,
        messageMode: matched.messageMode,
        messageText: stop.messageText
      };
    })
    .filter((value): value is RuntimeCheckpoint => value !== null);

  if (resolvedStops.length !== 3 || new Set(resolvedStops.map((stop) => normalizeText(stop.locationName))).size !== 3) {
    return input.missionRuntime;
  }

  return rebuildClassroomGuideRuntime(baseRuntime, {
    checkpoints: resolvedStops,
    greetingText,
    farewellText,
    activeStudentName: input.activeStudentName ?? null,
    studentMode: mode
  });
}

function createCheckpointNavigationStep(
  checkpoint: WorkshopCheckpoint,
  orderIndex: number,
  executionMode: WorkshopExecutionMode
) {
  return {
    type: "NAVIGATE",
    title: `Ir al lugar ${orderIndex}`,
    primaryValue: checkpoint.locationName,
    secondaryValue: checkpoint.alias,
    tertiaryValue: checkpoint.iconKey,
    quaternaryValue: executionMode
  };
}

function createCheckpointSpeechStep(checkpoint: WorkshopCheckpoint, orderIndex: number) {
  return {
    type: "SPEAK",
    title: `Presentar lugar ${orderIndex}`,
    primaryValue: checkpoint.messageText,
    secondaryValue: checkpoint.alias,
    tertiaryValue: checkpoint.iconKey
  };
}

type RuntimeCheckpoint = WorkshopCheckpoint;

function rebuildClassroomGuideRuntime(
  baseRuntime: Record<string, unknown>,
  input: {
    checkpoints: RuntimeCheckpoint[];
    greetingText: string | null;
    farewellText: string | null;
    activeStudentName: string | null;
    studentMode: WorkshopStudentMode;
  }
) {
  const executionMode = (readString(baseRuntime.executionMode) as WorkshopExecutionMode | undefined) ?? "normal";
  const baseLocationName = readString(baseRuntime.baseLocationName) ?? "Punto base";
  const [firstCheckpoint, secondCheckpoint, thirdCheckpoint] = input.checkpoints as [RuntimeCheckpoint, RuntimeCheckpoint, RuntimeCheckpoint];

  return {
    ...baseRuntime,
    studentMode: input.studentMode,
    activeStudentName: input.activeStudentName,
    checkpoints: input.checkpoints,
    steps: [
      {
        type: "TEACHER_APPROVAL",
        title: "Esperar aprobacion del docente",
        requiresTeacherApproval: true
      },
      {
        type: "SPEAK",
        title: "Saludo inicial",
        primaryValue: input.greetingText ?? "Hola equipo. Soy Temi y hoy voy a guiar nuestro salon."
      },
      createCheckpointNavigationStep(firstCheckpoint, 1, executionMode),
      createCheckpointSpeechStep(firstCheckpoint, 1),
      createCheckpointNavigationStep(secondCheckpoint, 2, executionMode),
      createCheckpointSpeechStep(secondCheckpoint, 2),
      createCheckpointNavigationStep(thirdCheckpoint, 3, executionMode),
      createCheckpointSpeechStep(thirdCheckpoint, 3),
      {
        type: "SPEAK",
        title: "Despedida",
        primaryValue: input.farewellText ?? "Gracias por este recorrido. Ahora voy a volver al punto base para el siguiente turno."
      },
      {
        type: "NAVIGATE",
        title: "Volver al punto base",
        primaryValue: baseLocationName,
        secondaryValue: executionMode
      },
      {
        type: "COMPLETE",
        title: "Completar mision"
      }
    ],
    studentSubmission: input.activeStudentName
      ? {
          studentName: input.activeStudentName,
          studentMode: input.studentMode
        }
      : undefined
  };
}

function readRuntimeCheckpoints(runtime: Record<string, unknown>) {
  return Array.isArray(runtime.checkpoints)
    ? runtime.checkpoints
        .map((value) => {
          const checkpoint = asRecord(value);
          if (!checkpoint) return null;

          const locationName = readString(checkpoint.locationName);
          const alias = readString(checkpoint.alias);
          const iconKey = readString(checkpoint.iconKey);
          const messageMode = readString(checkpoint.messageMode) as WorkshopMessageMode | undefined;
          const messageText = readString(checkpoint.messageText);

          if (!locationName || !alias || !iconKey || !messageMode || !messageText) {
            return null;
          }

          return {
            locationName,
            alias,
            iconKey: iconKey as WorkshopIconKey,
            messageMode,
            messageText
          };
        })
        .filter((value): value is RuntimeCheckpoint => value !== null)
    : [];
}

function asRecord(value: unknown) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function normalizeText(value: string | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}
