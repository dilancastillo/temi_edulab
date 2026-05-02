-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "CampusStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "SpaceKind" AS ENUM ('CLASSROOM', 'LIBRARY', 'LAB', 'AUDITORIUM', 'MAKERSPACE', 'OFFICE', 'OTHER');

-- CreateEnum
CREATE TYPE "LicenseStatus" AS ENUM ('TRIAL', 'ACTIVE', 'EXPIRED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "DataPolicyKind" AS ENUM ('PRIVACY', 'DATA_PROCESSING', 'MINORS_NOTICE', 'ROBOT_USE', 'MARKETING');

-- CreateEnum
CREATE TYPE "DataPolicyStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "TemplateKind" AS ENUM ('REPORT', 'CERTIFICATE', 'COMMUNICATION', 'RUBRIC', 'CONSENT', 'WORKSHOP_GUIDE');

-- CreateEnum
CREATE TYPE "TemplateStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATED', 'UPDATED', 'PUBLISHED', 'CONFIRMED', 'SUSPENDED');

-- AlterTable
ALTER TABLE "Institution"
ADD COLUMN "legalName" TEXT,
ADD COLUMN "daneCode" TEXT,
ADD COLUMN "department" TEXT,
ADD COLUMN "city" TEXT,
ADD COLUMN "country" TEXT NOT NULL DEFAULT 'Colombia',
ADD COLUMN "defaultLocale" TEXT NOT NULL DEFAULT 'es-CO',
ADD COLUMN "enabledLevels" JSONB,
ADD COLUMN "dataPolicyMode" TEXT NOT NULL DEFAULT 'TEMPLATE',
ADD COLUMN "marketingConsentEnabled" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Course"
ADD COLUMN "campusId" TEXT,
ADD COLUMN "academicLevel" TEXT,
ADD COLUMN "gradeLabel" TEXT,
ADD COLUMN "groupLabel" TEXT,
ADD COLUMN "academicYear" TEXT;

-- AlterTable
ALTER TABLE "User"
ADD COLUMN "accountStatus" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN "permissions" JSONB,
ADD COLUMN "locale" TEXT NOT NULL DEFAULT 'es-CO';

-- AlterTable
ALTER TABLE "Robot"
ADD COLUMN "campusId" TEXT,
ADD COLUMN "floorId" TEXT,
ADD COLUMN "spaceId" TEXT,
ADD COLUMN "serialNumber" TEXT,
ADD COLUMN "modelName" TEXT,
ADD COLUMN "firmwareVersion" TEXT,
ADD COLUMN "sdkVersion" TEXT,
ADD COLUMN "maintenanceStatus" TEXT;

-- CreateTable
CREATE TABLE "Campus" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "status" "CampusStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuildingFloor" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "campusId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "levelNumber" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BuildingFloor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningSpace" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "campusId" TEXT NOT NULL,
    "floorId" TEXT,
    "name" TEXT NOT NULL,
    "kind" "SpaceKind" NOT NULL,
    "capacity" INTEGER,
    "safetyNotes" TEXT,
    "accessibilityNotes" TEXT,
    "isRobotReady" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LearningSpace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstitutionLicense" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "LicenseStatus" NOT NULL DEFAULT 'TRIAL',
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "maxRobots" INTEGER NOT NULL,
    "maxTeachers" INTEGER NOT NULL,
    "maxStudents" INTEGER NOT NULL,
    "maxMissions" INTEGER NOT NULL,
    "trialMode" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstitutionLicense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstitutionBranding" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "logoUrl" TEXT,
    "sealUrl" TEXT,
    "primaryColor" TEXT NOT NULL DEFAULT '#2856a6',
    "accentColor" TEXT NOT NULL DEFAULT '#1f9d55',
    "neutralColor" TEXT NOT NULL DEFAULT '#f4f7fb',
    "marketingHeadline" TEXT,
    "welcomeMessage" TEXT,
    "reportFooter" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstitutionBranding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstitutionPolicy" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "kind" "DataPolicyKind" NOT NULL,
    "title" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "status" "DataPolicyStatus" NOT NULL DEFAULT 'DRAFT',
    "content" TEXT NOT NULL,
    "sourceReference" TEXT,
    "effectiveAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstitutionPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PolicyAcceptance" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "PolicyAcceptance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstitutionTemplate" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "kind" "TemplateKind" NOT NULL,
    "name" TEXT NOT NULL,
    "status" "TemplateStatus" NOT NULL DEFAULT 'DRAFT',
    "content" TEXT NOT NULL,
    "variables" JSONB NOT NULL,
    "requiresApproval" BOOLEAN NOT NULL DEFAULT true,
    "approvedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstitutionTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstitutionReportSnapshot" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "rangeStart" TIMESTAMP(3) NOT NULL,
    "rangeEnd" TIMESTAMP(3) NOT NULL,
    "metrics" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InstitutionReportSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RobotMaintenanceRecord" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "robotId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "notes" TEXT,
    "dueAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RobotMaintenanceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "actorId" TEXT,
    "action" "AuditAction" NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Campus_institutionId_status_idx" ON "Campus"("institutionId", "status");

-- CreateIndex
CREATE INDEX "BuildingFloor_institutionId_idx" ON "BuildingFloor"("institutionId");

-- CreateIndex
CREATE UNIQUE INDEX "BuildingFloor_campusId_levelNumber_key" ON "BuildingFloor"("campusId", "levelNumber");

-- CreateIndex
CREATE INDEX "LearningSpace_institutionId_kind_idx" ON "LearningSpace"("institutionId", "kind");

-- CreateIndex
CREATE INDEX "LearningSpace_campusId_idx" ON "LearningSpace"("campusId");

-- CreateIndex
CREATE INDEX "InstitutionLicense_institutionId_status_idx" ON "InstitutionLicense"("institutionId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "InstitutionBranding_institutionId_key" ON "InstitutionBranding"("institutionId");

-- CreateIndex
CREATE UNIQUE INDEX "InstitutionPolicy_institutionId_kind_version_key" ON "InstitutionPolicy"("institutionId", "kind", "version");

-- CreateIndex
CREATE INDEX "InstitutionPolicy_institutionId_status_idx" ON "InstitutionPolicy"("institutionId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PolicyAcceptance_userId_policyId_key" ON "PolicyAcceptance"("userId", "policyId");

-- CreateIndex
CREATE INDEX "PolicyAcceptance_institutionId_acceptedAt_idx" ON "PolicyAcceptance"("institutionId", "acceptedAt");

-- CreateIndex
CREATE INDEX "InstitutionTemplate_institutionId_kind_status_idx" ON "InstitutionTemplate"("institutionId", "kind", "status");

-- CreateIndex
CREATE INDEX "InstitutionReportSnapshot_institutionId_kind_createdAt_idx" ON "InstitutionReportSnapshot"("institutionId", "kind", "createdAt");

-- CreateIndex
CREATE INDEX "RobotMaintenanceRecord_institutionId_status_idx" ON "RobotMaintenanceRecord"("institutionId", "status");

-- CreateIndex
CREATE INDEX "RobotMaintenanceRecord_robotId_createdAt_idx" ON "RobotMaintenanceRecord"("robotId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_institutionId_createdAt_idx" ON "AuditLog"("institutionId", "createdAt");

-- CreateIndex
CREATE INDEX "Robot_campusId_idx" ON "Robot"("campusId");

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Robot" ADD CONSTRAINT "Robot_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Robot" ADD CONSTRAINT "Robot_floorId_fkey" FOREIGN KEY ("floorId") REFERENCES "BuildingFloor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Robot" ADD CONSTRAINT "Robot_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "LearningSpace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campus" ADD CONSTRAINT "Campus_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuildingFloor" ADD CONSTRAINT "BuildingFloor_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuildingFloor" ADD CONSTRAINT "BuildingFloor_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningSpace" ADD CONSTRAINT "LearningSpace_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningSpace" ADD CONSTRAINT "LearningSpace_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningSpace" ADD CONSTRAINT "LearningSpace_floorId_fkey" FOREIGN KEY ("floorId") REFERENCES "BuildingFloor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstitutionLicense" ADD CONSTRAINT "InstitutionLicense_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstitutionBranding" ADD CONSTRAINT "InstitutionBranding_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstitutionPolicy" ADD CONSTRAINT "InstitutionPolicy_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PolicyAcceptance" ADD CONSTRAINT "PolicyAcceptance_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PolicyAcceptance" ADD CONSTRAINT "PolicyAcceptance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PolicyAcceptance" ADD CONSTRAINT "PolicyAcceptance_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "InstitutionPolicy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstitutionTemplate" ADD CONSTRAINT "InstitutionTemplate_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstitutionTemplate" ADD CONSTRAINT "InstitutionTemplate_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstitutionReportSnapshot" ADD CONSTRAINT "InstitutionReportSnapshot_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RobotMaintenanceRecord" ADD CONSTRAINT "RobotMaintenanceRecord_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RobotMaintenanceRecord" ADD CONSTRAINT "RobotMaintenanceRecord_robotId_fkey" FOREIGN KEY ("robotId") REFERENCES "Robot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
