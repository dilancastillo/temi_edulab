function mapRole(role) {
    switch (role) {
        case "TEACHER":
            return "teacher";
        case "STUDENT":
            return "student";
        case "INSTITUTION_ADMIN":
            return "institution_admin";
        default:
            return "admin";
    }
}
function mapProgress(progress) {
    switch (progress) {
        case "NEEDS_REVIEW":
            return "Revisar";
        case "GRADED":
            return "Calificado";
        default:
            return "En curso";
    }
}
function mapMissionCategory(category) {
    switch (category) {
        case "LOGIC":
            return "Logica";
        case "CONTROL":
            return "Control";
        case "ROBOTICS":
            return "Robotica";
        default:
            return "Fundamentos";
    }
}
function mapAgeBand(ageBand) {
    switch (ageBand) {
        case "AGE_11_14":
            return "11-14";
        case "AGE_15_18":
            return "15-18";
        default:
            return "7-10";
    }
}
function mapCoverTone(tone) {
    return tone.toLowerCase();
}
function mapMissionStatus(status) {
    return status === "PUBLISHED" ? "published" : "draft";
}
function mapAssignmentStatus(status) {
    return status === "ACTIVE" ? "active" : "archived";
}
function mapStudentWorkStatus(status) {
    return status === "SUBMITTED" ? "submitted" : "draft";
}
function mapPairingStatus(status) {
    return status.toLowerCase();
}
function asRecord(value) {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
        return null;
    }
    return value;
}
function readString(value) {
    return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}
function readNumber(value) {
    return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}
function readBoolean(value) {
    return typeof value === "boolean" ? value : undefined;
}
export function serializeWorkshopRuntime(runtimeValue) {
    const runtime = asRecord(runtimeValue);
    if (!runtime || readString(runtime.type) !== "classroom_guide") {
        return undefined;
    }
    const checkpoints = Array.isArray(runtime.checkpoints)
        ? runtime.checkpoints
            .map((item) => {
            const checkpoint = asRecord(item);
            if (!checkpoint) {
                return null;
            }
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
                iconKey,
                messageMode,
                messageText
            };
        })
            .filter((item) => item !== null)
        : [];
    const checklist = asRecord(runtime.checklist);
    return {
        missionType: "classroom_guide",
        workshopName: readString(runtime.workshopName) ?? "Temi guia mi salon",
        studentMode: readString(runtime.studentMode) === "advanced" ? "advanced" : "guided",
        participationMode: readString(runtime.participationMode) ?? "individual",
        deviceMode: readString(runtime.deviceMode) ?? "student_device",
        executionMode: readString(runtime.executionMode) ?? "normal",
        turnDurationMinutes: readNumber(runtime.turnDurationMinutes) ?? 7,
        baseLocationName: readString(runtime.baseLocationName) ?? "",
        checkpoints,
        checklist: {
            robotConnected: readBoolean(checklist?.robotConnected) ?? false,
            batteryReady: readBoolean(checklist?.batteryReady) ?? false,
            mapReady: readBoolean(checklist?.mapReady) ?? false,
            checkpointsReady: readBoolean(checklist?.checkpointsReady) ?? false,
            baseReady: readBoolean(checklist?.baseReady) ?? false,
            routeSafeConfirmed: readBoolean(checklist?.routeSafeConfirmed) ?? false,
            executionModeConfirmed: readBoolean(checklist?.executionModeConfirmed) ?? false
        }
    };
}
export function serializeInstitution(institution) {
    return {
        id: institution.id,
        name: institution.name,
        slug: institution.slug,
        legalName: institution.legalName ?? undefined,
        daneCode: institution.daneCode ?? undefined,
        department: institution.department ?? undefined,
        city: institution.city ?? undefined,
        country: institution.country,
        defaultLocale: institution.defaultLocale,
        enabledLevels: Array.isArray(institution.enabledLevels) ? institution.enabledLevels.map(String) : [],
        dataPolicyMode: institution.dataPolicyMode,
        marketingConsentEnabled: institution.marketingConsentEnabled
    };
}
export function serializeCourse(course) {
    return {
        id: course.id,
        institutionId: course.institutionId,
        campusId: course.campusId ?? undefined,
        name: course.name,
        level: course.level,
        academicLevel: course.academicLevel ?? undefined,
        gradeLabel: course.gradeLabel ?? undefined,
        groupLabel: course.groupLabel ?? undefined,
        academicYear: course.academicYear ?? undefined
    };
}
export function serializeProfile(user) {
    return {
        id: user.id,
        institutionId: user.institutionId ?? "",
        fullName: user.fullName,
        email: user.email,
        biography: user.biography ?? "",
        avatarUrl: user.avatarUrl ?? undefined,
        accountStatus: user.accountStatus.toLowerCase(),
        locale: user.locale
    };
}
export function serializeSession(user, provider) {
    return {
        userId: user.id,
        institutionId: user.institutionId ?? "",
        role: mapRole(user.role),
        provider,
        displayName: user.fullName,
        email: user.email,
        studentId: user.role === "STUDENT" ? user.id : undefined
    };
}
export function serializeStudent(user) {
    return {
        id: user.id,
        institutionId: user.institutionId ?? "",
        courseId: user.courseId ?? "",
        fullName: user.fullName,
        email: user.email,
        progress: mapProgress(user.progress),
        currentMissionId: user.currentMissionId ?? undefined,
        avatarUrl: user.avatarUrl ?? undefined,
        createdAt: user.createdAt.toISOString()
    };
}
export function serializeMission(mission) {
    const outcomes = Array.isArray(mission.outcomes) ? mission.outcomes : [];
    return {
        id: mission.id,
        title: mission.title,
        summary: mission.summary,
        category: mapMissionCategory(mission.category),
        ageBand: mapAgeBand(mission.ageBand),
        durationMinutes: mission.durationMinutes,
        outcomes: outcomes.map((item) => String(item)),
        status: mapMissionStatus(mission.status),
        coverTone: mapCoverTone(mission.coverTone)
    };
}
export function serializeAssignment(assignment, workshopRuntime) {
    return {
        id: assignment.id,
        institutionId: assignment.institutionId,
        courseId: assignment.courseId,
        missionId: assignment.missionId,
        missionCode: assignment.missionCode,
        instructions: assignment.instructions ?? undefined,
        workshop: serializeWorkshopRuntime(workshopRuntime),
        status: mapAssignmentStatus(assignment.status),
        assignedAt: assignment.assignedAt.toISOString(),
        assignedBy: assignment.assignedById,
        completedCount: assignment.completedCount,
        reviewCount: assignment.reviewCount
    };
}
export function serializeStudentWork(work) {
    return {
        id: work.id,
        institutionId: work.institutionId,
        studentId: work.studentId,
        assignmentId: work.assignmentId,
        missionId: work.missionId,
        workspaceState: work.workspaceState ?? undefined,
        stepIndex: work.stepIndex,
        status: mapStudentWorkStatus(work.status),
        updatedAt: work.updatedAt.toISOString(),
        submittedAt: work.submittedAt?.toISOString()
    };
}
export function serializeRobot(robot) {
    return {
        id: robot.id,
        institutionId: robot.institutionId,
        courseId: robot.courseId ?? undefined,
        displayName: robot.displayName,
        classroomName: robot.classroomName ?? undefined,
        pairCode: robot.pairCode ?? undefined,
        connectionState: robot.connectionState,
        batteryPercent: robot.batteryPercent ?? undefined,
        statusLabel: robot.statusLabel ?? undefined,
        lastSeenAt: robot.lastSeenAt?.toISOString(),
        campusId: robot.campusId ?? undefined,
        floorId: robot.floorId ?? undefined,
        spaceId: robot.spaceId ?? undefined,
        serialNumber: robot.serialNumber ?? undefined,
        modelName: robot.modelName ?? undefined,
        firmwareVersion: robot.firmwareVersion ?? undefined,
        sdkVersion: robot.sdkVersion ?? undefined,
        maintenanceStatus: robot.maintenanceStatus ?? undefined
    };
}
export function serializeRobotLocation(location) {
    return {
        id: location.id,
        robotId: location.robotId,
        name: location.name,
        available: location.available,
        detail: location.detail ?? undefined,
        lastValidatedAt: location.lastValidatedAt.toISOString()
    };
}
export function serializeClassSession(session) {
    return {
        id: session.id,
        institutionId: session.institutionId,
        robotId: session.robotId,
        courseId: session.courseId,
        assignmentId: session.assignmentId,
        classroomName: session.classroomName,
        missionTitle: session.missionTitle,
        activeStudentName: session.activeStudentName ?? undefined,
        status: session.status.toLowerCase(),
        currentStepLabel: session.currentStepLabel ?? undefined,
        progressPercent: session.progressPercent,
        workshop: serializeWorkshopRuntime(session.missionRuntime),
        approvedAt: session.approvedAt?.toISOString(),
        startedAt: session.startedAt?.toISOString(),
        completedAt: session.completedAt?.toISOString(),
        createdAt: session.createdAt.toISOString(),
        updatedAt: session.updatedAt.toISOString()
    };
}
export function serializePairingRequest(request) {
    return {
        id: request.id,
        robotId: request.robotId ?? undefined,
        institutionId: request.institutionId ?? undefined,
        code: request.code,
        proposedName: request.proposedName,
        classroomName: request.classroomName ?? undefined,
        sessionUri: request.sessionUri ?? undefined,
        status: mapPairingStatus(request.status),
        expiresAt: request.expiresAt.toISOString(),
        confirmedAt: request.confirmedAt?.toISOString(),
        consumedAt: request.consumedAt?.toISOString()
    };
}
export function serializeCampus(campus) {
    return {
        id: campus.id,
        institutionId: campus.institutionId,
        name: campus.name,
        city: campus.city,
        address: campus.address ?? undefined,
        phone: campus.phone ?? undefined,
        status: campus.status.toLowerCase(),
        createdAt: campus.createdAt.toISOString()
    };
}
export function serializeBuildingFloor(floor) {
    return {
        id: floor.id,
        institutionId: floor.institutionId,
        campusId: floor.campusId,
        name: floor.name,
        levelNumber: floor.levelNumber
    };
}
export function serializeLearningSpace(space) {
    return {
        id: space.id,
        institutionId: space.institutionId,
        campusId: space.campusId,
        floorId: space.floorId ?? undefined,
        name: space.name,
        kind: space.kind.toLowerCase(),
        capacity: space.capacity ?? undefined,
        safetyNotes: space.safetyNotes ?? undefined,
        accessibilityNotes: space.accessibilityNotes ?? undefined,
        isRobotReady: space.isRobotReady
    };
}
export function serializeInstitutionLicense(license) {
    return {
        id: license.id,
        institutionId: license.institutionId,
        name: license.name,
        status: license.status.toLowerCase(),
        startsAt: license.startsAt.toISOString(),
        endsAt: license.endsAt.toISOString(),
        maxRobots: license.maxRobots,
        maxTeachers: license.maxTeachers,
        maxStudents: license.maxStudents,
        maxMissions: license.maxMissions,
        trialMode: license.trialMode,
        notes: license.notes ?? undefined
    };
}
export function serializeInstitutionBranding(branding) {
    if (!branding)
        return null;
    return {
        id: branding.id,
        institutionId: branding.institutionId,
        logoUrl: branding.logoUrl ?? undefined,
        sealUrl: branding.sealUrl ?? undefined,
        primaryColor: branding.primaryColor,
        accentColor: branding.accentColor,
        neutralColor: branding.neutralColor,
        marketingHeadline: branding.marketingHeadline ?? undefined,
        welcomeMessage: branding.welcomeMessage ?? undefined,
        reportFooter: branding.reportFooter ?? undefined
    };
}
export function serializeInstitutionPolicy(policy) {
    return {
        id: policy.id,
        institutionId: policy.institutionId,
        kind: policy.kind.toLowerCase(),
        title: policy.title,
        version: policy.version,
        status: policy.status.toLowerCase(),
        content: policy.content,
        sourceReference: policy.sourceReference ?? undefined,
        effectiveAt: policy.effectiveAt?.toISOString()
    };
}
export function serializeInstitutionTemplate(template) {
    return {
        id: template.id,
        institutionId: template.institutionId,
        kind: template.kind.toLowerCase(),
        name: template.name,
        status: template.status.toLowerCase(),
        content: template.content,
        variables: Array.isArray(template.variables) ? template.variables.map(String) : [],
        requiresApproval: template.requiresApproval,
        approvedAt: template.approvedAt?.toISOString(),
        approvedById: template.approvedById ?? undefined
    };
}
export function serializeInstitutionReportSnapshot(report) {
    return {
        id: report.id,
        institutionId: report.institutionId,
        kind: report.kind,
        title: report.title,
        rangeStart: report.rangeStart.toISOString(),
        rangeEnd: report.rangeEnd.toISOString(),
        metrics: asRecord(report.metrics) ?? {},
        createdAt: report.createdAt.toISOString()
    };
}
export function serializeRobotMaintenanceRecord(record) {
    return {
        id: record.id,
        institutionId: record.institutionId,
        robotId: record.robotId,
        kind: record.kind,
        status: record.status,
        notes: record.notes ?? undefined,
        dueAt: record.dueAt?.toISOString(),
        completedAt: record.completedAt?.toISOString(),
        createdAt: record.createdAt.toISOString()
    };
}
export function serializeAuditLog(log) {
    return {
        id: log.id,
        institutionId: log.institutionId,
        actorId: log.actorId ?? undefined,
        action: log.action.toLowerCase(),
        resourceType: log.resourceType,
        resourceId: log.resourceId ?? undefined,
        metadata: asRecord(log.metadata) ?? undefined,
        createdAt: log.createdAt.toISOString()
    };
}
