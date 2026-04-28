export function buildMissionRuntime(input) {
    const targetLocation = input.locations.find((location) => location.available && location.normalizedName.includes("biblioteca")) ??
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
export function buildClassroomGuideRuntime(input) {
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
export function materializeRobotMissionRuntime(input) {
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
    const greetingText = (mode === "advanced"
        ? readString(asRecord(studentWorkspace.advancedDraft)?.greetingText)
        : readString(asRecord(studentWorkspace.greeting)?.text)) ?? null;
    const farewellText = (mode === "advanced"
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
            if (!stop)
                return null;
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
            .filter((value) => value !== null)
        : [];
    const normalizedRuntimeLocations = new Map(checkpoints.flatMap((checkpoint) => {
        const entries = [[normalizeText(checkpoint.locationName), checkpoint]];
        const aliasKey = normalizeText(checkpoint.alias);
        if (aliasKey && aliasKey !== normalizeText(checkpoint.locationName)) {
            entries.push([aliasKey, checkpoint]);
        }
        return entries;
    }));
    const resolvedStops = advancedStops
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
        .filter((value) => value !== null);
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
function createCheckpointNavigationStep(checkpoint, orderIndex, executionMode) {
    return {
        type: "NAVIGATE",
        title: `Ir al lugar ${orderIndex}`,
        primaryValue: checkpoint.locationName,
        secondaryValue: checkpoint.alias,
        tertiaryValue: checkpoint.iconKey,
        quaternaryValue: executionMode
    };
}
function createCheckpointSpeechStep(checkpoint, orderIndex) {
    return {
        type: "SPEAK",
        title: `Presentar lugar ${orderIndex}`,
        primaryValue: checkpoint.messageText,
        secondaryValue: checkpoint.alias,
        tertiaryValue: checkpoint.iconKey
    };
}
function rebuildClassroomGuideRuntime(baseRuntime, input) {
    const executionMode = readString(baseRuntime.executionMode) ?? "normal";
    const baseLocationName = readString(baseRuntime.baseLocationName) ?? "Punto base";
    const [firstCheckpoint, secondCheckpoint, thirdCheckpoint] = input.checkpoints;
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
function readRuntimeCheckpoints(runtime) {
    return Array.isArray(runtime.checkpoints)
        ? runtime.checkpoints
            .map((value) => {
            const checkpoint = asRecord(value);
            if (!checkpoint)
                return null;
            const locationName = readString(checkpoint.locationName);
            const alias = readString(checkpoint.alias);
            const iconKey = readString(checkpoint.iconKey);
            const messageMode = readString(checkpoint.messageMode);
            const messageText = readString(checkpoint.messageText);
            if (!locationName || !alias || !iconKey || !messageMode || !messageText) {
                return null;
            }
            return {
                locationName,
                alias,
                iconKey: iconKey,
                messageMode,
                messageText
            };
        })
            .filter((value) => value !== null)
        : [];
}
function asRecord(value) {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
        return null;
    }
    return value;
}
function readString(value) {
    return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}
function normalizeText(value) {
    return (value ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");
}
