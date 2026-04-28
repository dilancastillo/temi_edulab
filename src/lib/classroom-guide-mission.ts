import type { WorkshopIconKey, WorkshopSession } from "@/lib/types";

export type ClassroomGuideMode = "guided" | "advanced";

export type ClassroomGuideBlockType =
  | "guide_start"
  | "guide_greeting"
  | "guide_go_to"
  | "guide_explain"
  | "guide_farewell"
  | "guide_return_base";

export type ClassroomGuideTextResponse = {
  text: string;
  done: boolean;
};

export type ClassroomGuideCheckpointState = {
  locationName: string;
  alias: string;
  iconKey: WorkshopIconKey;
  teacherPrompt: string;
  teacherLocationName: string;
  teacherAlias: string;
  teacherIconKey: WorkshopIconKey;
  studentMessage: string;
  done: boolean;
};

export type ClassroomGuideLocationOption = {
  locationName: string;
  alias: string;
  iconKey: WorkshopIconKey;
  teacherPrompt: string;
};

export type ClassroomGuideAdvancedStop = {
  locationName: string;
  alias: string;
  iconKey: WorkshopIconKey;
  messageText: string;
};

export type ClassroomGuideAdvancedDraft = {
  greetingText: string;
  farewellText: string;
  stops: ClassroomGuideAdvancedStop[];
};

export type ClassroomGuideWorkspace = {
  missionType: "classroom_guide";
  mode: ClassroomGuideMode;
  greeting: ClassroomGuideTextResponse;
  farewell: ClassroomGuideTextResponse;
  baseLocationName: string;
  checkpoints: ClassroomGuideCheckpointState[];
  advancedSequence: ClassroomGuideBlockType[];
  advancedDraft?: ClassroomGuideAdvancedDraft;
  advancedWorkspaceState?: unknown;
};

export type ClassroomGuideEvaluation = {
  completedChallenges: number;
  totalChallenges: number;
  completedVisibleSteps: number;
  totalVisibleSteps: number;
  isGuidedComplete: boolean;
  isAdvancedSequenceComplete: boolean;
  isReadyToSubmit: boolean;
  nextChallengeIndex: number;
  message: string;
};

export const classroomGuideChallenges = [
  {
    key: "greeting",
    title: "Temi saluda",
    helper: "Elige o escribe un saludo corto para comenzar."
  },
  {
    key: "checkpoint-1",
    title: "Lugar 1",
    helper: "Cuenta que hay en el primer lugar del recorrido."
  },
  {
    key: "checkpoint-2",
    title: "Lugar 2",
    helper: "Agrega una frase clara para la segunda parada."
  },
  {
    key: "checkpoint-3",
    title: "Lugar 3",
    helper: "Presenta el ultimo lugar importante del salon."
  },
  {
    key: "farewell",
    title: "Temi se despide",
    helper: "Cierra la visita y prepara a Temi para volver."
  }
] as const;

export const classroomGuideAdvancedSteps: { type: ClassroomGuideBlockType; label: string }[] = [
  { type: "guide_start", label: "Iniciar mision" },
  { type: "guide_greeting", label: "Saludar" },
  { type: "guide_go_to", label: "Ir al lugar 1" },
  { type: "guide_explain", label: "Explicar lugar 1" },
  { type: "guide_go_to", label: "Ir al lugar 2" },
  { type: "guide_explain", label: "Explicar lugar 2" },
  { type: "guide_go_to", label: "Ir al lugar 3" },
  { type: "guide_explain", label: "Explicar lugar 3" },
  { type: "guide_farewell", label: "Despedirse" },
  { type: "guide_return_base", label: "Volver al punto base" }
] as const;

export function buildClassroomGuideWorkspace(workshop?: WorkshopSession, savedState?: unknown): ClassroomGuideWorkspace {
  const fallback = buildFallbackWorkspace(workshop);
  if (!savedState || typeof savedState !== "object" || Array.isArray(savedState)) {
    return fallback;
  }

  const candidate = savedState as Partial<ClassroomGuideWorkspace>;
  if (candidate.missionType !== "classroom_guide") {
    return fallback;
  }

  const mode = workshop?.studentMode ?? (candidate.mode === "advanced" ? "advanced" : "guided");
  const baseWorkspace: ClassroomGuideWorkspace = {
    missionType: "classroom_guide",
    mode,
    greeting: readTextResponse(candidate.greeting) ?? fallback.greeting,
    farewell: readTextResponse(candidate.farewell) ?? fallback.farewell,
    baseLocationName: readShortText(candidate.baseLocationName) ?? fallback.baseLocationName,
    checkpoints: mergeCheckpoints(fallback.checkpoints, candidate.checkpoints),
    advancedSequence: Array.isArray(candidate.advancedSequence)
      ? candidate.advancedSequence.filter(isClassroomGuideBlockType)
      : fallback.advancedSequence,
    advancedDraft: readAdvancedDraft(candidate.advancedDraft),
    advancedWorkspaceState: candidate.advancedWorkspaceState ?? undefined
  };

  return mode === "advanced" ? syncWorkspaceFromAdvanced(baseWorkspace) : baseWorkspace;
}

export function evaluateClassroomGuideWorkspace(workspace: ClassroomGuideWorkspace): ClassroomGuideEvaluation {
  return workspace.mode === "advanced" ? evaluateAdvancedWorkspace(workspace) : evaluateGuidedWorkspace(workspace);
}

export function setGreetingText(workspace: ClassroomGuideWorkspace, text: string) {
  return {
    ...workspace,
    greeting: {
      ...workspace.greeting,
      text: text.slice(0, 90),
      done: false
    }
  };
}

export function setFarewellText(workspace: ClassroomGuideWorkspace, text: string) {
  return {
    ...workspace,
    farewell: {
      ...workspace.farewell,
      text: text.slice(0, 90),
      done: false
    }
  };
}

export function completeGreeting(workspace: ClassroomGuideWorkspace) {
  return {
    ...workspace,
    greeting: {
      ...workspace.greeting,
      done: isValidText(workspace.greeting.text)
    }
  };
}

export function completeFarewell(workspace: ClassroomGuideWorkspace) {
  return {
    ...workspace,
    farewell: {
      ...workspace.farewell,
      done: isValidText(workspace.farewell.text)
    }
  };
}

export function updateCheckpointMessage(
  workspace: ClassroomGuideWorkspace,
  checkpointIndex: number,
  messageText: string
): ClassroomGuideWorkspace {
  const checkpoints = [...workspace.checkpoints];
  checkpoints[checkpointIndex] = {
    ...checkpoints[checkpointIndex],
    studentMessage: messageText.slice(0, 90),
    done: false
  };

  return {
    ...workspace,
    checkpoints
  };
}

export function completeCheckpoint(workspace: ClassroomGuideWorkspace, checkpointIndex: number) {
  const checkpoints = [...workspace.checkpoints];
  checkpoints[checkpointIndex] = {
    ...checkpoints[checkpointIndex],
    done: isValidText(checkpoints[checkpointIndex]?.studentMessage)
  };

  return {
    ...workspace,
    checkpoints
  };
}

export function applyAdvancedChange(
  workspace: ClassroomGuideWorkspace,
  change: {
    sequence: ClassroomGuideBlockType[];
    draft: ClassroomGuideAdvancedDraft;
    workspaceState: unknown;
  }
): ClassroomGuideWorkspace {
  return syncWorkspaceFromAdvanced({
    ...workspace,
    mode: "advanced",
    advancedSequence: change.sequence,
    advancedDraft: change.draft,
    advancedWorkspaceState: change.workspaceState
  });
}

export function getClassroomGuideLocationOptions(workspace: ClassroomGuideWorkspace): ClassroomGuideLocationOption[] {
  const seen = new Set<string>();

  return workspace.checkpoints
    .map((checkpoint) => ({
      locationName: checkpoint.teacherLocationName || checkpoint.locationName,
      alias: checkpoint.teacherAlias || checkpoint.alias,
      iconKey: checkpoint.teacherIconKey || checkpoint.iconKey,
      teacherPrompt: checkpoint.teacherPrompt
    }))
    .filter((option) => {
      const key = normalize(option.locationName);
      if (!key || seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
}

export function createGreetingIdeas() {
  return [
    "Hola. Soy Temi y hoy voy a guiar nuestro salon.",
    "Hola equipo. Vamos a visitar tres lugares importantes.",
    "Bienvenidos. Soy Temi y sere su guia en este recorrido."
  ];
}

export function createFarewellIdeas() {
  return [
    "Gracias por la visita. Ahora voy a volver al punto base.",
    "Listo. Terminamos el recorrido y regreso a mi lugar inicial.",
    "Gracias equipo. Ya acabe la visita y vuelvo al punto base."
  ];
}

export function createCheckpointIdeas(
  checkpoint: ClassroomGuideCheckpointState,
  orderIndex: number
) {
  const alias = checkpoint.alias.trim() || `Lugar ${orderIndex + 1}`;

  return [
    checkpoint.teacherPrompt.trim() || `${alias}. Aqui aprendemos algo importante.`,
    `${alias}. En este lugar compartimos ideas y trabajos del grupo.`,
    `${alias}. Este espacio es importante para nuestro salon.`
  ].map((item) => item.slice(0, 90));
}

function buildFallbackWorkspace(workshop?: WorkshopSession): ClassroomGuideWorkspace {
  const checkpoints =
    workshop?.checkpoints.length === 3
      ? workshop.checkpoints.map((checkpoint) => ({
          locationName: checkpoint.locationName,
          alias: checkpoint.alias,
          iconKey: checkpoint.iconKey,
          teacherPrompt: checkpoint.messageText,
          teacherLocationName: checkpoint.locationName,
          teacherAlias: checkpoint.alias,
          teacherIconKey: checkpoint.iconKey,
          studentMessage: "",
          done: false
        }))
      : [0, 1, 2].map((index) => ({
          locationName: `lugar-${index + 1}`,
          alias: `Lugar ${index + 1}`,
          iconKey: defaultIcon(index),
          teacherPrompt: "",
          teacherLocationName: `lugar-${index + 1}`,
          teacherAlias: `Lugar ${index + 1}`,
          teacherIconKey: defaultIcon(index),
          studentMessage: "",
          done: false
        }));

  return {
    missionType: "classroom_guide",
    mode: workshop?.studentMode ?? "guided",
    greeting: {
      text: "",
      done: false
    },
    farewell: {
      text: "",
      done: false
    },
    baseLocationName: workshop?.baseLocationName ?? "punto base",
    checkpoints,
    advancedSequence: [],
    advancedDraft: undefined,
    advancedWorkspaceState: undefined
  };
}

function evaluateGuidedWorkspace(workspace: ClassroomGuideWorkspace): ClassroomGuideEvaluation {
  const challengeChecks = [
    workspace.greeting.done && isValidText(workspace.greeting.text),
    workspace.checkpoints[0]?.done && isValidText(workspace.checkpoints[0]?.studentMessage),
    workspace.checkpoints[1]?.done && isValidText(workspace.checkpoints[1]?.studentMessage),
    workspace.checkpoints[2]?.done && isValidText(workspace.checkpoints[2]?.studentMessage),
    workspace.farewell.done && isValidText(workspace.farewell.text)
  ];

  let completedChallenges = 0;
  for (const isComplete of challengeChecks) {
    if (!isComplete) {
      break;
    }
    completedChallenges += 1;
  }

  const isGuidedComplete = completedChallenges === classroomGuideChallenges.length;
  if (isGuidedComplete) {
    return {
      completedChallenges,
      totalChallenges: classroomGuideChallenges.length,
      completedVisibleSteps: completedChallenges,
      totalVisibleSteps: classroomGuideChallenges.length,
      isGuidedComplete: true,
      isAdvancedSequenceComplete: false,
      isReadyToSubmit: true,
      nextChallengeIndex: classroomGuideChallenges.length,
      message: "Ya terminaste. Revisa tu recorrido y envialo cuando quieras."
    };
  }

  return {
    completedChallenges,
    totalChallenges: classroomGuideChallenges.length,
    completedVisibleSteps: completedChallenges,
    totalVisibleSteps: classroomGuideChallenges.length,
    isGuidedComplete: false,
    isAdvancedSequenceComplete: false,
    isReadyToSubmit: false,
    nextChallengeIndex: completedChallenges,
    message: `Vamos con ${classroomGuideChallenges[completedChallenges]?.title.toLowerCase() ?? "el siguiente reto"}.`
  };
}

function evaluateAdvancedWorkspace(workspace: ClassroomGuideWorkspace): ClassroomGuideEvaluation {
  const sequence = workspace.advancedSequence;
  const [firstCheckpoint, secondCheckpoint, thirdCheckpoint] = workspace.checkpoints;
  const locationOptions = getClassroomGuideLocationOptions(workspace);
  const firstLocationKey = resolveLocationKey(firstCheckpoint?.locationName, locationOptions);
  const secondLocationKey = resolveLocationKey(secondCheckpoint?.locationName, locationOptions);
  const thirdLocationKey = resolveLocationKey(thirdCheckpoint?.locationName, locationOptions);
  const selectedLocations: string[] = [];

  const stepChecks = [
    sequence[0] === "guide_start",
    sequence[1] === "guide_greeting" && isValidText(workspace.greeting.text),
    sequence[2] === "guide_go_to" && isAdvancedLocationValid(firstCheckpoint?.locationName, locationOptions, selectedLocations),
    sequence[3] === "guide_explain" && isValidText(firstCheckpoint?.studentMessage),
    sequence[4] === "guide_go_to" && isAdvancedLocationValid(secondCheckpoint?.locationName, locationOptions, selectedLocations),
    sequence[5] === "guide_explain" && isValidText(secondCheckpoint?.studentMessage),
    sequence[6] === "guide_go_to" && isAdvancedLocationValid(thirdCheckpoint?.locationName, locationOptions, selectedLocations),
    sequence[7] === "guide_explain" && isValidText(thirdCheckpoint?.studentMessage),
    sequence[8] === "guide_farewell" && isValidText(workspace.farewell.text),
    sequence[9] === "guide_return_base"
  ];

  let completedVisibleSteps = 0;
  for (const isComplete of stepChecks) {
    if (!isComplete) {
      break;
    }
    completedVisibleSteps += 1;
  }

  const isAdvancedSequenceComplete = completedVisibleSteps === classroomGuideAdvancedSteps.length;
  const isGuidedComplete =
    isValidText(workspace.greeting.text) &&
    workspace.checkpoints.every((checkpoint) => isValidText(checkpoint.studentMessage)) &&
    isValidText(workspace.farewell.text);

  if (isAdvancedSequenceComplete) {
    return {
      completedChallenges: isGuidedComplete ? classroomGuideChallenges.length : 0,
      totalChallenges: classroomGuideChallenges.length,
      completedVisibleSteps,
      totalVisibleSteps: classroomGuideAdvancedSteps.length,
      isGuidedComplete,
      isAdvancedSequenceComplete,
      isReadyToSubmit: true,
      nextChallengeIndex: classroomGuideAdvancedSteps.length,
      message: "Tu recorrido en bloques ya esta listo para enviar."
    };
  }

  const message =
    sequence[0] !== "guide_start"
      ? "Empieza con iniciar mision."
      : sequence[1] !== "guide_greeting"
        ? "Ahora agrega el bloque Saludar."
        : !isValidText(workspace.greeting.text)
          ? "Tu saludo es muy corto. Escribe al menos 4 letras."
          : sequence[2] !== "guide_go_to"
            ? "Despues del saludo agrega Ir a un lugar."
            : !isAdvancedLocationSelected(firstCheckpoint?.locationName, locationOptions)
              ? `Elige un lugar valido para la primera parada. Usa uno de estos: ${formatLocationOptions(locationOptions)}.`
              : sequence[3] !== "guide_explain"
                ? "Despues del lugar 1 agrega Explicar lugar."
                : !isValidText(firstCheckpoint?.studentMessage)
                  ? "Escribe un mensaje corto para el lugar 1."
                  : sequence[4] !== "guide_go_to"
                    ? "Ahora agrega Ir a un lugar para la segunda parada."
                    : !isAdvancedLocationSelected(secondCheckpoint?.locationName, locationOptions)
                      ? `Elige un lugar valido para la segunda parada. Usa uno de estos: ${formatLocationOptions(locationOptions)}.`
                      : secondLocationKey === firstLocationKey
                        ? "La segunda parada debe ir a un lugar diferente."
                        : sequence[5] !== "guide_explain"
                          ? "Despues del lugar 2 agrega Explicar lugar."
                          : !isValidText(secondCheckpoint?.studentMessage)
                            ? "Escribe un mensaje corto para el lugar 2."
                            : sequence[6] !== "guide_go_to"
                              ? "Ahora agrega Ir a un lugar para la tercera parada."
                              : !isAdvancedLocationSelected(thirdCheckpoint?.locationName, locationOptions)
                                ? `Elige un lugar valido para la tercera parada. Usa uno de estos: ${formatLocationOptions(locationOptions)}.`
                                : thirdLocationKey === firstLocationKey || thirdLocationKey === secondLocationKey
                                  ? "La tercera parada debe ir a un lugar diferente."
                                  : sequence[7] !== "guide_explain"
                                    ? "Despues del lugar 3 agrega Explicar lugar."
                                    : !isValidText(thirdCheckpoint?.studentMessage)
                                      ? "Escribe un mensaje corto para el lugar 3."
                                      : sequence[8] !== "guide_farewell"
                                        ? "Antes de terminar agrega Despedirse."
                                        : !isValidText(workspace.farewell.text)
                                          ? "Tu despedida es muy corta. Escribe al menos 4 letras."
                                          : "Para cerrar, agrega Volver al punto base.";

  return {
    completedChallenges: isGuidedComplete ? classroomGuideChallenges.length : 0,
    totalChallenges: classroomGuideChallenges.length,
    completedVisibleSteps,
    totalVisibleSteps: classroomGuideAdvancedSteps.length,
    isGuidedComplete,
    isAdvancedSequenceComplete: false,
    isReadyToSubmit: false,
    nextChallengeIndex: completedVisibleSteps,
    message
  };
}

function syncWorkspaceFromAdvanced(workspace: ClassroomGuideWorkspace): ClassroomGuideWorkspace {
  const draft = workspace.advancedDraft;
  if (!draft) {
    return workspace;
  }

  const locationOptions = getClassroomGuideLocationOptions(workspace);
  const checkpoints = [0, 1, 2].map((index) => {
    const current = workspace.checkpoints[index];
    const stop = draft.stops[index];
    const matchedOption = locationOptions.find(
      (option) =>
        normalize(option.locationName) === normalize(stop?.locationName ?? "") ||
        normalize(option.alias) === normalize(stop?.locationName ?? "")
    );
    const teacherLocationName = current?.teacherLocationName ?? current?.locationName ?? `lugar-${index + 1}`;
    const teacherAlias = current?.teacherAlias ?? current?.alias ?? `Lugar ${index + 1}`;
    const teacherIconKey = current?.teacherIconKey ?? current?.iconKey ?? defaultIcon(index);
    const teacherPrompt = current?.teacherPrompt ?? "";

    return {
      locationName: matchedOption?.locationName ?? stop?.locationName ?? current?.locationName ?? teacherLocationName,
      alias: matchedOption?.alias ?? stop?.alias ?? current?.alias ?? teacherAlias,
      iconKey: matchedOption?.iconKey ?? stop?.iconKey ?? current?.iconKey ?? teacherIconKey,
      teacherPrompt,
      teacherLocationName,
      teacherAlias,
      teacherIconKey,
      studentMessage: (stop?.messageText ?? current?.studentMessage ?? "").slice(0, 90),
      done: isValidText(stop?.messageText ?? current?.studentMessage)
    };
  });

  return {
    ...workspace,
    greeting: {
      text: draft.greetingText.slice(0, 90),
      done: isValidText(draft.greetingText)
    },
    farewell: {
      text: draft.farewellText.slice(0, 90),
      done: isValidText(draft.farewellText)
    },
    checkpoints
  };
}

function mergeCheckpoints(baseCheckpoints: ClassroomGuideCheckpointState[], savedCheckpoints: unknown) {
  if (!Array.isArray(savedCheckpoints)) {
    return baseCheckpoints;
  }

  return baseCheckpoints.map((baseCheckpoint, index) => {
    const savedCheckpoint = savedCheckpoints[index];
    if (typeof savedCheckpoint !== "object" || savedCheckpoint === null || Array.isArray(savedCheckpoint)) {
      return baseCheckpoint;
    }

    const candidate = savedCheckpoint as Partial<ClassroomGuideCheckpointState>;
    return {
      locationName: readShortText(candidate.locationName) ?? baseCheckpoint.locationName,
      alias: readShortText(candidate.alias) ?? baseCheckpoint.alias,
      iconKey: isIconKey(candidate.iconKey) ? candidate.iconKey : baseCheckpoint.iconKey,
      teacherPrompt: baseCheckpoint.teacherPrompt,
      teacherLocationName: baseCheckpoint.teacherLocationName,
      teacherAlias: baseCheckpoint.teacherAlias,
      teacherIconKey: baseCheckpoint.teacherIconKey,
      studentMessage: readShortText(candidate.studentMessage) ?? "",
      done: candidate.done === true && isValidText(candidate.studentMessage)
    };
  });
}

function readTextResponse(value: unknown): ClassroomGuideTextResponse | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return undefined;
  }

  const candidate = value as Partial<ClassroomGuideTextResponse>;
  return {
    text: readShortText(candidate.text) ?? "",
    done: candidate.done === true && isValidText(candidate.text)
  };
}

function readAdvancedDraft(value: unknown): ClassroomGuideAdvancedDraft | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return undefined;
  }

  const candidate = value as Partial<ClassroomGuideAdvancedDraft>;
  return {
    greetingText: readShortText(candidate.greetingText) ?? "",
    farewellText: readShortText(candidate.farewellText) ?? "",
    stops: Array.isArray(candidate.stops)
      ? candidate.stops
          .map((item) => {
            if (typeof item !== "object" || item === null || Array.isArray(item)) {
              return null;
            }

            const stop = item as Partial<ClassroomGuideAdvancedStop>;
            const locationName = readShortText(stop.locationName);
            const alias = readShortText(stop.alias);
            const iconKey = isIconKey(stop.iconKey) ? stop.iconKey : undefined;
            const messageText = readShortText(stop.messageText);

            if (!locationName || !alias || !iconKey) {
              return null;
            }

            return {
              locationName,
              alias,
              iconKey,
              messageText: messageText ?? ""
            };
          })
          .filter((item): item is ClassroomGuideAdvancedStop => item !== null)
      : []
  };
}

function readShortText(value: unknown) {
  return typeof value === "string" ? value.slice(0, 90) : undefined;
}

function isValidText(value: string | undefined) {
  return typeof value === "string" && value.trim().length >= 4 && value.trim().length <= 90;
}

function isIconKey(value: unknown): value is WorkshopIconKey {
  return value === "board" || value === "books" || value === "star" || value === "paint" || value === "microscope" || value === "trophy";
}

function isClassroomGuideBlockType(value: unknown): value is ClassroomGuideBlockType {
  return value === "guide_start" || value === "guide_greeting" || value === "guide_go_to" || value === "guide_explain" || value === "guide_farewell" || value === "guide_return_base";
}

function defaultIcon(index: number): WorkshopIconKey {
  return (["board", "books", "star"] as WorkshopIconKey[])[index] ?? "star";
}

function normalize(value: string | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function isAdvancedLocationValid(
  locationName: string | undefined,
  locationOptions: ClassroomGuideLocationOption[],
  selectedLocations: string[]
) {
  const normalized = resolveLocationKey(locationName, locationOptions);
  if (!normalized || selectedLocations.includes(normalized)) {
    return false;
  }
  selectedLocations.push(normalized);
  return true;
}

function isAdvancedLocationSelected(locationName: string | undefined, locationOptions: ClassroomGuideLocationOption[]) {
  return Boolean(resolveLocationKey(locationName, locationOptions));
}

function resolveLocationKey(locationName: string | undefined, locationOptions: ClassroomGuideLocationOption[]) {
  const normalized = normalize(locationName);
  if (!normalized) {
    return null;
  }

  const match = locationOptions.find(
    (option) => normalize(option.locationName) === normalized || normalize(option.alias) === normalized
  );

  return match ? normalize(match.locationName) : null;
}

function formatLocationOptions(locationOptions: ClassroomGuideLocationOption[]) {
  return locationOptions.map((option) => option.alias || option.locationName).join(", ");
}
