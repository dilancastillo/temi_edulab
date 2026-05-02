import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { buildBootstrap } from "../services/bootstrap.js";
import { requireInstitutionAdminSession } from "../lib/session-auth.js";

const colorSchema = z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, "Usa un color hexadecimal valido.");

const institutionSettingsSchema = z.object({
  name: z.string().trim().min(3).max(120),
  legalName: z.string().trim().max(160).optional(),
  daneCode: z.string().trim().max(30).optional(),
  department: z.string().trim().max(80).optional(),
  city: z.string().trim().max(80).optional(),
  defaultLocale: z.enum(["es-CO", "en-US"]),
  enabledLevels: z.array(z.enum(["PREESCOLAR", "BASICA_PRIMARIA", "BASICA_SECUNDARIA", "MEDIA"])).min(1),
  marketingConsentEnabled: z.boolean()
});

const brandingSchema = z.object({
  logoUrl: z.string().trim().url().optional().or(z.literal("")),
  sealUrl: z.string().trim().url().optional().or(z.literal("")),
  primaryColor: colorSchema,
  accentColor: colorSchema,
  neutralColor: colorSchema,
  marketingHeadline: z.string().trim().max(120).optional(),
  welcomeMessage: z.string().trim().max(200).optional(),
  reportFooter: z.string().trim().max(240).optional()
});

const campusSchema = z.object({
  name: z.string().trim().min(3).max(120),
  city: z.string().trim().min(2).max(80),
  address: z.string().trim().max(160).optional(),
  phone: z.string().trim().max(40).optional()
});

const spaceSchema = z.object({
  campusId: z.string().min(1),
  floorName: z.string().trim().min(1).max(60),
  levelNumber: z.number().int().min(-2).max(40),
  name: z.string().trim().min(2).max(120),
  kind: z.enum(["classroom", "library", "lab", "auditorium", "makerspace", "office", "other"]),
  capacity: z.number().int().min(1).max(200).optional(),
  safetyNotes: z.string().trim().max(240).optional(),
  accessibilityNotes: z.string().trim().max(240).optional(),
  isRobotReady: z.boolean()
});

const staffSchema = z.object({
  fullName: z.string().trim().min(3).max(120),
  email: z.string().email().transform((value) => value.trim().toLowerCase()),
  password: z.string().min(8).max(80),
  rolePreset: z.enum(["teacher", "institution_admin", "academic_coordinator", "technical_support"]),
  courseId: z.string().optional()
});

const templateSchema = z.object({
  kind: z.enum(["report", "certificate", "communication", "rubric", "consent", "workshop_guide"]),
  name: z.string().trim().min(3).max(120),
  content: z.string().trim().min(10).max(3000),
  variables: z.array(z.string().trim().min(2).max(50)).max(20),
  requiresApproval: z.boolean()
});

const policyPublishSchema = z.object({
  content: z.string().trim().min(20).max(6000).optional()
});

function templateKind(value: string) {
  return value.toUpperCase() as "REPORT" | "CERTIFICATE" | "COMMUNICATION" | "RUBRIC" | "CONSENT" | "WORKSHOP_GUIDE";
}

function spaceKind(value: string) {
  return value.toUpperCase() as "CLASSROOM" | "LIBRARY" | "LAB" | "AUDITORIUM" | "MAKERSPACE" | "OFFICE" | "OTHER";
}

function permissionsForPreset(rolePreset: z.infer<typeof staffSchema>["rolePreset"]) {
  const base = {
    institution: false,
    courses: false,
    robots: false,
    reports: false,
    templates: false,
    dataPolicies: false,
    classroomTeaching: false
  };

  if (rolePreset === "institution_admin") {
    return { ...base, institution: true, courses: true, robots: true, reports: true, templates: true, dataPolicies: true, classroomTeaching: true, preset: rolePreset };
  }

  if (rolePreset === "academic_coordinator") {
    return { ...base, courses: true, robots: true, reports: true, templates: true, classroomTeaching: true, preset: rolePreset };
  }

  if (rolePreset === "technical_support") {
    return { ...base, robots: true, reports: true, preset: rolePreset };
  }

  return { ...base, classroomTeaching: true, preset: rolePreset };
}

async function audit(app: FastifyInstance, input: { institutionId: string; actorId: string; action: "CREATED" | "UPDATED" | "PUBLISHED"; resourceType: string; resourceId?: string; metadata?: Prisma.InputJsonValue }) {
  await app.prisma.auditLog.create({
    data: {
      institutionId: input.institutionId,
      actorId: input.actorId,
      action: input.action,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      metadata: input.metadata
    }
  });
}

export async function registerInstitutionRoutes(app: FastifyInstance) {
  app.patch("/v1/institution/settings", async (request) => {
    const admin = await requireInstitutionAdminSession(app, request);
    const body = institutionSettingsSchema.parse(request.body);

    await app.prisma.institution.update({
      where: { id: admin.institutionId },
      data: {
        name: body.name,
        legalName: body.legalName,
        daneCode: body.daneCode,
        department: body.department,
        city: body.city,
        defaultLocale: body.defaultLocale,
        enabledLevels: body.enabledLevels,
        marketingConsentEnabled: body.marketingConsentEnabled
      }
    });

    await audit(app, {
      institutionId: admin.institutionId,
      actorId: admin.id,
      action: "UPDATED",
      resourceType: "institution_settings",
      metadata: { defaultLocale: body.defaultLocale, enabledLevels: body.enabledLevels }
    });

    return buildBootstrap(app, admin.id);
  });

  app.patch("/v1/institution/branding", async (request) => {
    const admin = await requireInstitutionAdminSession(app, request);
    const body = brandingSchema.parse(request.body);

    await app.prisma.institutionBranding.upsert({
      where: { institutionId: admin.institutionId },
      create: {
        institutionId: admin.institutionId,
        logoUrl: body.logoUrl || null,
        sealUrl: body.sealUrl || null,
        primaryColor: body.primaryColor,
        accentColor: body.accentColor,
        neutralColor: body.neutralColor,
        marketingHeadline: body.marketingHeadline,
        welcomeMessage: body.welcomeMessage,
        reportFooter: body.reportFooter
      },
      update: {
        logoUrl: body.logoUrl || null,
        sealUrl: body.sealUrl || null,
        primaryColor: body.primaryColor,
        accentColor: body.accentColor,
        neutralColor: body.neutralColor,
        marketingHeadline: body.marketingHeadline,
        welcomeMessage: body.welcomeMessage,
        reportFooter: body.reportFooter
      }
    });

    await audit(app, {
      institutionId: admin.institutionId,
      actorId: admin.id,
      action: "UPDATED",
      resourceType: "institution_branding",
      metadata: { primaryColor: body.primaryColor, accentColor: body.accentColor }
    });

    return buildBootstrap(app, admin.id);
  });

  app.post("/v1/institution/campuses", async (request) => {
    const admin = await requireInstitutionAdminSession(app, request);
    const body = campusSchema.parse(request.body);

    const campus = await app.prisma.campus.create({
      data: {
        institutionId: admin.institutionId,
        name: body.name,
        city: body.city,
        address: body.address,
        phone: body.phone
      }
    });

    await audit(app, {
      institutionId: admin.institutionId,
      actorId: admin.id,
      action: "CREATED",
      resourceType: "campus",
      resourceId: campus.id,
      metadata: { name: campus.name }
    });

    return buildBootstrap(app, admin.id);
  });

  app.post("/v1/institution/spaces", async (request) => {
    const admin = await requireInstitutionAdminSession(app, request);
    const body = spaceSchema.parse(request.body);

    const campus = await app.prisma.campus.findUnique({ where: { id: body.campusId } });
    if (!campus || campus.institutionId !== admin.institutionId) {
      throw app.httpErrors.notFound("No encontramos esa sede en la institucion.");
    }

    const floor = await app.prisma.buildingFloor.upsert({
      where: {
        campusId_levelNumber: {
          campusId: campus.id,
          levelNumber: body.levelNumber
        }
      },
      create: {
        institutionId: admin.institutionId,
        campusId: campus.id,
        name: body.floorName,
        levelNumber: body.levelNumber
      },
      update: {
        name: body.floorName
      }
    });

    const space = await app.prisma.learningSpace.create({
      data: {
        institutionId: admin.institutionId,
        campusId: campus.id,
        floorId: floor.id,
        name: body.name,
        kind: spaceKind(body.kind),
        capacity: body.capacity,
        safetyNotes: body.safetyNotes,
        accessibilityNotes: body.accessibilityNotes,
        isRobotReady: body.isRobotReady
      }
    });

    await audit(app, {
      institutionId: admin.institutionId,
      actorId: admin.id,
      action: "CREATED",
      resourceType: "learning_space",
      resourceId: space.id,
      metadata: { campusId: campus.id, kind: body.kind }
    });

    return buildBootstrap(app, admin.id);
  });

  app.post("/v1/institution/staff", async (request) => {
    const admin = await requireInstitutionAdminSession(app, request);
    const body = staffSchema.parse(request.body);

    const existing = await app.prisma.user.findUnique({ where: { email: body.email } });
    if (existing) {
      throw app.httpErrors.conflict("Ya existe un usuario con ese correo.");
    }

    const role = body.rolePreset === "teacher" ? "TEACHER" : "INSTITUTION_ADMIN";
    const passwordHash = await bcrypt.hash(body.password, 10);
    const user = await app.prisma.user.create({
      data: {
        id: `user-${crypto.randomUUID()}`,
        institutionId: admin.institutionId,
        courseId: body.courseId || null,
        role,
        authProvider: "PASSWORD",
        fullName: body.fullName,
        email: body.email,
        passwordHash,
        permissions: permissionsForPreset(body.rolePreset) as Prisma.InputJsonValue,
        biography: "",
        avatarUrl: null
      }
    });

    await audit(app, {
      institutionId: admin.institutionId,
      actorId: admin.id,
      action: "CREATED",
      resourceType: "staff_user",
      resourceId: user.id,
      metadata: { rolePreset: body.rolePreset }
    });

    return buildBootstrap(app, admin.id);
  });

  app.post("/v1/institution/templates", async (request) => {
    const admin = await requireInstitutionAdminSession(app, request);
    const body = templateSchema.parse(request.body);

    const template = await app.prisma.institutionTemplate.create({
      data: {
        institutionId: admin.institutionId,
        kind: templateKind(body.kind),
        name: body.name,
        status: body.requiresApproval ? "PENDING_APPROVAL" : "APPROVED",
        content: body.content,
        variables: body.variables,
        requiresApproval: body.requiresApproval,
        approvedAt: body.requiresApproval ? null : new Date(),
        approvedById: body.requiresApproval ? null : admin.id
      }
    });

    await audit(app, {
      institutionId: admin.institutionId,
      actorId: admin.id,
      action: "CREATED",
      resourceType: "institution_template",
      resourceId: template.id,
      metadata: { kind: body.kind }
    });

    return buildBootstrap(app, admin.id);
  });

  app.post("/v1/institution/policies/:policyId/publish", async (request) => {
    const admin = await requireInstitutionAdminSession(app, request);
    const params = z.object({ policyId: z.string().min(1) }).parse(request.params);
    const body = policyPublishSchema.parse(request.body);

    const policy = await app.prisma.institutionPolicy.findUnique({ where: { id: params.policyId } });
    if (!policy || policy.institutionId !== admin.institutionId) {
      throw app.httpErrors.notFound("No encontramos esa politica institucional.");
    }

    await app.prisma.institutionPolicy.update({
      where: { id: policy.id },
      data: {
        content: body.content ?? policy.content,
        status: "PUBLISHED",
        effectiveAt: new Date()
      }
    });

    await audit(app, {
      institutionId: admin.institutionId,
      actorId: admin.id,
      action: "PUBLISHED",
      resourceType: "institution_policy",
      resourceId: policy.id,
      metadata: { kind: policy.kind, version: policy.version }
    });

    return buildBootstrap(app, admin.id);
  });
}
