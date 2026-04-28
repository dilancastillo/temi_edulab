import { serializeAssignment, serializeClassSession, serializeCourse, serializeInstitution, serializeMission, serializePairingRequest, serializeProfile, serializeRobot, serializeStudent, serializeStudentWork } from "../lib/serializers.js";
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
        pairingRequests: pairingRequests.map(serializePairingRequest)
    };
}
