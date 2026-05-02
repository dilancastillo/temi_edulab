import { serializeAssignment, serializeAuditLog, serializeBuildingFloor, serializeCampus, serializeClassSession, serializeCourse, serializeInstitutionBranding, serializeInstitutionLicense, serializeInstitutionPolicy, serializeInstitutionReportSnapshot, serializeInstitutionTemplate, serializeInstitution, serializeLearningSpace, serializeMission, serializePairingRequest, serializeProfile, serializeRobot, serializeRobotMaintenanceRecord, serializeStudent, serializeStudentWork } from "../lib/serializers.js";
export async function buildBootstrap(app, userId) {
    const user = await app.prisma.user.findUnique({
        where: { id: userId }
    });
    if (!user || !user.institutionId) {
        throw app.httpErrors.unauthorized("La sesion ya no es valida.");
    }
    const institution = await app.prisma.institution.findUnique({
        where: { id: user.institutionId }
    });
    if (!institution) {
        throw app.httpErrors.notFound("No encontramos la institucion de la sesion.");
    }
    const courses = await app.prisma.course.findMany({
        where: { institutionId: user.institutionId },
        orderBy: { name: "asc" }
    });
    const missions = await app.prisma.mission.findMany({
        orderBy: { title: "asc" }
    });
    const assignments = user.role === "STUDENT" && user.courseId
        ? await app.prisma.assignment.findMany({
            where: { institutionId: user.institutionId, courseId: user.courseId },
            orderBy: { assignedAt: "desc" }
        })
        : await app.prisma.assignment.findMany({
            where: { institutionId: user.institutionId },
            orderBy: { assignedAt: "desc" }
        });
    const activeClassSessionsForAssignments = await app.prisma.classSession.findMany({
        where: {
            institutionId: user.institutionId,
            assignmentId: { in: assignments.map((assignment) => assignment.id) },
            status: { not: "COMPLETED" }
        },
        orderBy: { updatedAt: "desc" }
    });
    const workshopByAssignmentId = new Map();
    for (const session of activeClassSessionsForAssignments) {
        if (!workshopByAssignmentId.has(session.assignmentId)) {
            workshopByAssignmentId.set(session.assignmentId, session.missionRuntime);
        }
    }
    const students = user.role === "STUDENT"
        ? [user]
        : await app.prisma.user.findMany({
            where: { institutionId: user.institutionId, role: "STUDENT" },
            orderBy: { fullName: "asc" }
        });
    const studentWorks = user.role === "STUDENT"
        ? await app.prisma.studentWork.findMany({
            where: { institutionId: user.institutionId, studentId: user.id },
            orderBy: { updatedAt: "desc" }
        })
        : await app.prisma.studentWork.findMany({
            where: { institutionId: user.institutionId },
            orderBy: { updatedAt: "desc" }
        });
    const robots = user.role === "STUDENT"
        ? []
        : await app.prisma.robot.findMany({
            where: { institutionId: user.institutionId },
            orderBy: { displayName: "asc" }
        });
    const classSessions = user.role === "STUDENT"
        ? []
        : await app.prisma.classSession.findMany({
            where: { institutionId: user.institutionId },
            orderBy: { updatedAt: "desc" },
            take: 10
        });
    const pairingRequests = user.role === "STUDENT"
        ? []
        : await app.prisma.pairingRequest.findMany({
            where: {
                OR: [{ institutionId: null }, { institutionId: user.institutionId }],
                expiresAt: { gt: new Date() }
            },
            orderBy: { createdAt: "desc" }
        });
    const institutional = user.role === "STUDENT"
        ? emptyInstitutionalSnapshot()
        : await buildInstitutionalSnapshot(app, user.institutionId);
    return {
        session: {
            userId: user.id,
            institutionId: user.institutionId,
            role: user.role === "TEACHER"
                ? "teacher"
                : user.role === "STUDENT"
                    ? "student"
                    : user.role === "INSTITUTION_ADMIN"
                        ? "institution_admin"
                        : "admin",
            provider: user.role === "STUDENT" ? "password" : "password",
            displayName: user.fullName,
            email: user.email,
            studentId: user.role === "STUDENT" ? user.id : undefined
        },
        institution: serializeInstitution(institution),
        courses: courses.map(serializeCourse),
        missions: missions.map(serializeMission),
        students: students.map(serializeStudent),
        assignments: assignments.map((assignment) => serializeAssignment(assignment, workshopByAssignmentId.get(assignment.id))),
        studentWorks: studentWorks.map(serializeStudentWork),
        profile: serializeProfile(user),
        robots: robots.map(serializeRobot),
        classSessions: classSessions.map(serializeClassSession),
        pairingRequests: pairingRequests.map(serializePairingRequest),
        institutional
    };
}
function emptyInstitutionalSnapshot() {
    return {
        campuses: [],
        floors: [],
        spaces: [],
        licenses: [],
        branding: null,
        policies: [],
        templates: [],
        reportSnapshots: [],
        maintenanceRecords: [],
        auditLogs: [],
        summary: {
            campuses: 0,
            spaces: 0,
            activeTeachers: 0,
            activeStudents: 0,
            robots: 0,
            connectedRobots: 0,
            activeLicenses: 0,
            publishedPolicies: 0,
            approvedTemplates: 0
        }
    };
}
async function buildInstitutionalSnapshot(app, institutionId) {
    const [campuses, floors, spaces, licenses, branding, policies, templates, reportSnapshots, maintenanceRecords, auditLogs, activeTeachers, activeStudents, connectedRobots] = await Promise.all([
        app.prisma.campus.findMany({ where: { institutionId }, orderBy: { name: "asc" } }),
        app.prisma.buildingFloor.findMany({ where: { institutionId }, orderBy: [{ campusId: "asc" }, { levelNumber: "asc" }] }),
        app.prisma.learningSpace.findMany({ where: { institutionId }, orderBy: [{ campusId: "asc" }, { name: "asc" }] }),
        app.prisma.institutionLicense.findMany({ where: { institutionId }, orderBy: { endsAt: "desc" } }),
        app.prisma.institutionBranding.findUnique({ where: { institutionId } }),
        app.prisma.institutionPolicy.findMany({ where: { institutionId }, orderBy: [{ status: "asc" }, { updatedAt: "desc" }] }),
        app.prisma.institutionTemplate.findMany({ where: { institutionId }, orderBy: [{ status: "asc" }, { updatedAt: "desc" }] }),
        app.prisma.institutionReportSnapshot.findMany({ where: { institutionId }, orderBy: { createdAt: "desc" }, take: 8 }),
        app.prisma.robotMaintenanceRecord.findMany({ where: { institutionId }, orderBy: { createdAt: "desc" }, take: 8 }),
        app.prisma.auditLog.findMany({ where: { institutionId }, orderBy: { createdAt: "desc" }, take: 12 }),
        app.prisma.user.count({ where: { institutionId, role: { in: ["TEACHER", "INSTITUTION_ADMIN"] }, accountStatus: "ACTIVE" } }),
        app.prisma.user.count({ where: { institutionId, role: "STUDENT", accountStatus: "ACTIVE" } }),
        app.prisma.robot.count({ where: { institutionId, connectionState: "CONNECTED" } })
    ]);
    return {
        campuses: campuses.map(serializeCampus),
        floors: floors.map(serializeBuildingFloor),
        spaces: spaces.map(serializeLearningSpace),
        licenses: licenses.map(serializeInstitutionLicense),
        branding: serializeInstitutionBranding(branding),
        policies: policies.map(serializeInstitutionPolicy),
        templates: templates.map(serializeInstitutionTemplate),
        reportSnapshots: reportSnapshots.map(serializeInstitutionReportSnapshot),
        maintenanceRecords: maintenanceRecords.map(serializeRobotMaintenanceRecord),
        auditLogs: auditLogs.map(serializeAuditLog),
        summary: {
            campuses: campuses.length,
            spaces: spaces.length,
            activeTeachers,
            activeStudents,
            robots: await app.prisma.robot.count({ where: { institutionId } }),
            connectedRobots,
            activeLicenses: licenses.filter((license) => ["ACTIVE", "TRIAL"].includes(license.status)).length,
            publishedPolicies: policies.filter((policy) => policy.status === "PUBLISHED").length,
            approvedTemplates: templates.filter((template) => template.status === "APPROVED").length
        }
    };
}
