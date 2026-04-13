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
export function serializeInstitution(institution) {
    return {
        id: institution.id,
        name: institution.name,
        slug: institution.slug
    };
}
export function serializeCourse(course) {
    return {
        id: course.id,
        institutionId: course.institutionId,
        name: course.name,
        level: course.level
    };
}
export function serializeProfile(user) {
    return {
        id: user.id,
        institutionId: user.institutionId ?? "",
        fullName: user.fullName,
        email: user.email,
        biography: user.biography ?? "",
        avatarUrl: user.avatarUrl ?? undefined
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
export function serializeAssignment(assignment) {
    return {
        id: assignment.id,
        institutionId: assignment.institutionId,
        courseId: assignment.courseId,
        missionId: assignment.missionId,
        missionCode: assignment.missionCode,
        instructions: assignment.instructions ?? undefined,
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
        lastSeenAt: robot.lastSeenAt?.toISOString()
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
