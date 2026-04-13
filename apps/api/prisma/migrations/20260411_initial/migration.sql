-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('TEACHER', 'STUDENT', 'INSTITUTION_ADMIN', 'ADMIN');

-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('PASSWORD', 'GOOGLE', 'MICROSOFT', 'MISSION_CODE', 'DEVICE');

-- CreateEnum
CREATE TYPE "StudentProgress" AS ENUM ('IN_PROGRESS', 'NEEDS_REVIEW', 'GRADED');

-- CreateEnum
CREATE TYPE "MissionCategory" AS ENUM ('FUNDAMENTALS', 'LOGIC', 'CONTROL', 'ROBOTICS');

-- CreateEnum
CREATE TYPE "MissionAgeBand" AS ENUM ('AGE_7_10', 'AGE_11_14', 'AGE_15_18');

-- CreateEnum
CREATE TYPE "MissionStatus" AS ENUM ('PUBLISHED', 'DRAFT');

-- CreateEnum
CREATE TYPE "CoverTone" AS ENUM ('BLUE', 'GREEN', 'YELLOW', 'RED', 'INDIGO', 'SLATE');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "StudentWorkStatus" AS ENUM ('DRAFT', 'SUBMITTED');

-- CreateEnum
CREATE TYPE "ClassSessionStatus" AS ENUM ('PENDING_APPROVAL', 'READY', 'RUNNING', 'PAUSED', 'ERROR', 'SAFE_MODE', 'COMPLETED');

-- CreateEnum
CREATE TYPE "PairingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CONSUMED', 'EXPIRED');

-- CreateTable
CREATE TABLE "Institution" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Institution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Course" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT,
    "courseId" TEXT,
    "role" "UserRole" NOT NULL,
    "authProvider" "AuthProvider" NOT NULL DEFAULT 'PASSWORD',
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "biography" TEXT,
    "avatarUrl" TEXT,
    "progress" "StudentProgress",
    "currentMissionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mission" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "category" "MissionCategory" NOT NULL,
    "ageBand" "MissionAgeBand" NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "outcomes" JSONB NOT NULL,
    "status" "MissionStatus" NOT NULL,
    "coverTone" "CoverTone" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Mission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assignment" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "missionCode" TEXT NOT NULL,
    "instructions" TEXT,
    "status" "AssignmentStatus" NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL,
    "assignedById" TEXT NOT NULL,
    "completedCount" INTEGER NOT NULL DEFAULT 0,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Assignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentWork" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "workspaceState" JSONB,
    "stepIndex" INTEGER NOT NULL,
    "status" "StudentWorkStatus" NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentWork_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Robot" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "courseId" TEXT,
    "displayName" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "classroomName" TEXT,
    "pairCode" TEXT,
    "pairCodeExpiresAt" TIMESTAMP(3),
    "deviceTokenHash" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "connectionState" TEXT NOT NULL DEFAULT 'CHECKING',
    "batteryPercent" INTEGER,
    "statusLabel" TEXT,
    "lastSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Robot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RobotLocation" (
    "id" TEXT NOT NULL,
    "robotId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "available" BOOLEAN NOT NULL,
    "detail" TEXT,
    "lastValidatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RobotLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassSession" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "robotId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "classroomName" TEXT NOT NULL,
    "missionTitle" TEXT NOT NULL,
    "activeStudentName" TEXT,
    "status" "ClassSessionStatus" NOT NULL,
    "missionRuntime" JSONB NOT NULL,
    "currentStepLabel" TEXT,
    "progressPercent" INTEGER NOT NULL DEFAULT 0,
    "approvedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClassSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RobotEvent" (
    "id" TEXT NOT NULL,
    "robotId" TEXT NOT NULL,
    "classSessionId" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RobotEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PairingRequest" (
    "id" TEXT NOT NULL,
    "robotId" TEXT,
    "institutionId" TEXT,
    "confirmedById" TEXT,
    "code" TEXT NOT NULL,
    "proposedName" TEXT NOT NULL,
    "classroomName" TEXT,
    "sessionUri" TEXT,
    "status" "PairingStatus" NOT NULL DEFAULT 'PENDING',
    "pendingDeviceToken" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "confirmedAt" TIMESTAMP(3),
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PairingRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Institution_slug_key" ON "Institution"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Course_institutionId_name_key" ON "Course"("institutionId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "WebSession_tokenHash_key" ON "WebSession"("tokenHash");

-- CreateIndex
CREATE INDEX "WebSession_userId_idx" ON "WebSession"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Assignment_missionCode_key" ON "Assignment"("missionCode");

-- CreateIndex
CREATE INDEX "Assignment_institutionId_status_idx" ON "Assignment"("institutionId", "status");

-- CreateIndex
CREATE INDEX "Assignment_courseId_status_idx" ON "Assignment"("courseId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "StudentWork_studentId_assignmentId_key" ON "StudentWork"("studentId", "assignmentId");

-- CreateIndex
CREATE UNIQUE INDEX "Robot_slug_key" ON "Robot"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Robot_pairCode_key" ON "Robot"("pairCode");

-- CreateIndex
CREATE UNIQUE INDEX "Robot_deviceTokenHash_key" ON "Robot"("deviceTokenHash");

-- CreateIndex
CREATE INDEX "Robot_institutionId_idx" ON "Robot"("institutionId");

-- CreateIndex
CREATE INDEX "RobotLocation_robotId_available_idx" ON "RobotLocation"("robotId", "available");

-- CreateIndex
CREATE UNIQUE INDEX "RobotLocation_robotId_normalizedName_key" ON "RobotLocation"("robotId", "normalizedName");

-- CreateIndex
CREATE INDEX "ClassSession_robotId_status_idx" ON "ClassSession"("robotId", "status");

-- CreateIndex
CREATE INDEX "ClassSession_institutionId_status_idx" ON "ClassSession"("institutionId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "RobotEvent_idempotencyKey_key" ON "RobotEvent"("idempotencyKey");

-- CreateIndex
CREATE INDEX "RobotEvent_robotId_createdAt_idx" ON "RobotEvent"("robotId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PairingRequest_code_key" ON "PairingRequest"("code");

-- CreateIndex
CREATE INDEX "PairingRequest_status_expiresAt_idx" ON "PairingRequest"("status", "expiresAt");

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebSession" ADD CONSTRAINT "WebSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentWork" ADD CONSTRAINT "StudentWork_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentWork" ADD CONSTRAINT "StudentWork_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentWork" ADD CONSTRAINT "StudentWork_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentWork" ADD CONSTRAINT "StudentWork_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Robot" ADD CONSTRAINT "Robot_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Robot" ADD CONSTRAINT "Robot_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RobotLocation" ADD CONSTRAINT "RobotLocation_robotId_fkey" FOREIGN KEY ("robotId") REFERENCES "Robot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassSession" ADD CONSTRAINT "ClassSession_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassSession" ADD CONSTRAINT "ClassSession_robotId_fkey" FOREIGN KEY ("robotId") REFERENCES "Robot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassSession" ADD CONSTRAINT "ClassSession_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassSession" ADD CONSTRAINT "ClassSession_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassSession" ADD CONSTRAINT "ClassSession_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RobotEvent" ADD CONSTRAINT "RobotEvent_robotId_fkey" FOREIGN KEY ("robotId") REFERENCES "Robot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RobotEvent" ADD CONSTRAINT "RobotEvent_classSessionId_fkey" FOREIGN KEY ("classSessionId") REFERENCES "ClassSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PairingRequest" ADD CONSTRAINT "PairingRequest_robotId_fkey" FOREIGN KEY ("robotId") REFERENCES "Robot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PairingRequest" ADD CONSTRAINT "PairingRequest_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PairingRequest" ADD CONSTRAINT "PairingRequest_confirmedById_fkey" FOREIGN KEY ("confirmedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
