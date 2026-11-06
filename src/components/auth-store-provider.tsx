"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Session as SupabaseSession } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { baseOverrideId, isBaseMission, mergeWithBaseMissions, originalBaseMission } from "@/lib/base-missions";
import {
  demoCourses,
  demoInstitution,
  demoMissions,
} from "@/lib/demo-data";
import type {
  Assignment,
  AuthResult,
  Course,
  CreateMissionInput,
  ImportedStudent,
  Institution,
  Mission,
  ProfileInput,
  Student,
  StudentInput,
  StudentLoginResult,
  StudentWork,
  TeacherProfile,
} from "@/lib/types";
import { FREE_PLAY_ASSIGNMENT_ID, FREE_PLAY_MISSION_ID } from "@/lib/types";
import { postJson, type ApiFailure } from "@/lib/api-client";
import type { SaveResult } from "@/components/use-work-autosave";

// ─── Types ────────────────────────────────────────────────────────────────────

type AssignMissionInput = {
  missionId: string;
  courseId: string;
  instructions?: string;
};

type SaveStudentWorkInput = {
  studentId: string;
  assignmentId: string;
  missionId: string;
  workspaceState: unknown;
  stepIndex: number;
};

type SubmitStudentWorkInput = SaveStudentWorkInput;

export type AuthStore = {
  isReady: boolean;
  session: SupabaseSession | null;
  teacherId: string | null;
  studentSession: { studentId: string; displayName: string } | null;
  profile: TeacherProfile | null;
  institution: Institution;
  courses: Course[];
  missions: Mission[];
  students: Student[];
  assignments: Assignment[];
  studentWorks: StudentWork[];
  robotIp: string;

  // Auth
  loginWithPassword: (email: string, password: string) => Promise<AuthResult>;
  loginWithGoogle: (idToken: string) => Promise<AuthResult>;
  /** Cierra la sesión del docente (por defecto) o solo la del estudiante. */
  logout: (scope?: "teacher" | "student") => Promise<void>;

  // Estudiantes
  loginStudentWithPassword: (email: string, password: string) => Promise<StudentLoginResult>;
  loginStudentWithMissionCode: (missionCode: string, studentName: string) => Promise<StudentLoginResult>;
  addStudent: (input: StudentInput) => Promise<{ ok: boolean; message?: string }>;
  updateStudent: (studentId: string, input: StudentInput) => Promise<{ ok: boolean; message?: string }>;
  deleteStudent: (studentId: string) => Promise<void>;
  importStudents: (students: ImportedStudent[]) => Promise<{ added: number; skipped: string[] }>;

  // Asignaciones
  assignMission: (input: AssignMissionInput) => Promise<void>;
  archiveAssignment: (assignmentId: string) => Promise<void>;
  deleteAssignment: (assignmentId: string) => Promise<void>;

  // Misiones personalizadas
  createMission: (input: CreateMissionInput) => Promise<{ ok: boolean; message?: string }>;
  editMission: (mission: Mission) => Promise<{ ok: boolean; message?: string }>;
  deleteMission: (missionId: string) => Promise<void>;

  // Trabajos: devuelven si el servidor confirmó el guardado (ok) o si no hubo conexión (offline).
  saveStudentWork: (input: SaveStudentWorkInput) => Promise<SaveResult>;
  submitStudentWork: (input: SubmitStudentWorkInput) => Promise<SaveResult>;

  // Sincronización del docente: mensaje de la última acción que no se pudo guardar.
  syncError: string | null;
  clearSyncError: () => void;
  refreshTeacherData: () => Promise<void>;

  // Perfil
  updateProfile: (input: ProfileInput) => Promise<void>;

  // Robot
  setRobotIp: (ip: string) => void;

  // Juego libre
  deleteFreePlayProgress: () => Promise<void>;
};

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthStoreContext = createContext<AuthStore | null>(null);

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function mapSupabaseError(message: string): string {
  if (message.includes("Invalid login credentials")) {
    return "Correo o contraseña incorrectos.";
  }
  if (message.includes("Email not confirmed")) {
    return "Debes confirmar tu correo antes de ingresar.";
  }
  return "No se pudo iniciar sesión. Intenta de nuevo.";
}

function buildDefaultProfile(teacherId: string, email: string): TeacherProfile {
  return {
    id: teacherId,
    teacherId,
    institutionId: demoInstitution.id,
    fullName: email.split("@")[0] ?? "Docente",
    email,
    biography: "",
  };
}

function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createMissionCode(): string {
  return Math.random().toString(36).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6).padEnd(6, "7");
}

function getRobotIpDefault(): string {
  if (typeof window === "undefined") return process.env.NEXT_PUBLIC_ROBOT_API_URL ?? "http://192.168.10.64:8765";
  try {
    const stored = window.localStorage.getItem("esbot.robotIp.v1");
    if (stored) return JSON.parse(stored) as string;
  } catch { /* ignore */ }
  return process.env.NEXT_PUBLIC_ROBOT_API_URL ?? "http://192.168.10.64:8765";
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthStoreProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [isReady, setIsReady] = useState(false);
  const [session, setSession] = useState<SupabaseSession | null>(null);
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [studentSession, setStudentSession] = useState<{ studentId: string; displayName: string } | null>(null);
  const [missions, setMissions] = useState<Mission[]>(demoMissions);
  const [students, setStudents] = useState<Student[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [studentWorks, setStudentWorks] = useState<StudentWork[]>([]);
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [robotIp, setRobotIpState] = useState<string>(() => getRobotIpDefault());

  // Keep a ref to studentWorks for use inside callbacks without stale closure
  const studentWorksRef = useRef(studentWorks);
  useEffect(() => { studentWorksRef.current = studentWorks; }, [studentWorks]);

  // ── 5.1: Auth state subscription + session restore ──────────────────────────

  const loadTeacherData = useCallback(async (userEmail: string) => {
    try {
      const res = await fetch(`/api/teacher/data`);
      const data = await res.json() as {
        ok: boolean;
        students?: Student[];
        assignments?: Assignment[];
        studentWorks?: StudentWork[];
        profile?: TeacherProfile | null;
        missions?: Mission[];
      };
      if (data.ok) {
        setStudents(data.students ?? []);
        setAssignments(data.assignments ?? []);
        setStudentWorks(data.studentWorks ?? []);
        const uid = data.profile?.teacherId ?? data.profile?.id ?? "";
        setProfile(data.profile ?? buildDefaultProfile(uid, userEmail));
        setMissions(mergeWithBaseMissions(data.missions ?? []));
        if (uid) setTeacherId(uid);
      }
    } catch { /* ignore */ }
    setIsReady(true);
  }, []);

  // ── Sincronización: si una acción del docente no llega al servidor, se avisa y se
  // recargan los datos reales, para no dejar en pantalla cambios que no se guardaron.
  const [syncError, setSyncError] = useState<string | null>(null);
  const clearSyncError = useCallback(() => setSyncError(null), []);
  const refreshTeacherData = useCallback(() => loadTeacherData(""), [loadTeacherData]);

  const reportSyncFailure = useCallback((action: string, failure: ApiFailure) => {
    setSyncError(
      failure.offline
        ? `${action}: no hay conexión a internet. El cambio no se guardó; vuelve a intentarlo cuando regrese la conexión.`
        : `${action}: ${failure.message}`
    );
    void loadTeacherData("");
  }, [loadTeacherData]);

  const clearTeacherData = useCallback(() => {
    setSession(null);
    setTeacherId(null);
    setStudents([]);
    setAssignments([]);
    setStudentWorks([]);
    setProfile(null);
  }, []);

  const loadStudentData = useCallback(async (teacherId: string, studentId: string) => {
    try {
      const res = await fetch(`/api/student/data?studentId=${studentId}&teacherId=${teacherId}`);
      const data = await res.json() as { ok: boolean; student?: Record<string, unknown>; assignments?: unknown[]; studentWorks?: unknown[]; robotId?: string | null; missions?: Mission[] };
      if (data.ok) {
        // Guardar el robotId del docente para que el estudiante use el robot correcto
        if (data.robotId) {
          try { window.localStorage.setItem("esbot.robotId.v1", data.robotId); } catch { /* ignore */ }
        }
        // Setear el estudiante
        if (data.student) {
          const r = data.student;
          setStudents([{
            id: r.id as string,
            teacherId: r.teacher_id as string,
            institutionId: r.institution_id as string,
            courseId: r.course_id as string,
            fullName: r.full_name as string,
            email: r.email as string,
            password: (r.password as string) ?? "",
            progress: r.progress as Student["progress"],
            currentMissionId: r.current_mission_id as string | undefined,
            avatarUrl: r.avatar_url as string | undefined,
            createdAt: r.created_at as string,
          }]);
        }
        if (Array.isArray(data.assignments)) {
          setAssignments(data.assignments.map((row) => {
            const r = row as Record<string, unknown>;
            return {
              id: r.id as string,
              teacherId: r.teacher_id as string,
              institutionId: r.institution_id as string,
              courseId: r.course_id as string,
              missionId: r.mission_id as string,
              missionCode: r.mission_code as string,
              instructions: r.instructions as string | undefined,
              status: r.status as "active" | "archived",
              assignedAt: r.assigned_at as string,
              assignedBy: r.assigned_by as string,
              completedCount: r.completed_count as number,
              reviewCount: r.review_count as number,
            };
          }));
        }
        if (Array.isArray(data.studentWorks)) {
          setStudentWorks(data.studentWorks.map((row) => {
            const r = row as Record<string, unknown>;
            return {
              id: r.id as string,
              teacherId: r.teacher_id as string,
              institutionId: r.institution_id as string,
              studentId: r.student_id as string,
              assignmentId: r.assignment_id as string,
              missionId: r.mission_id as string,
              workspaceState: r.workspace_state,
              stepIndex: Number(r.step_index),
              status: r.status as "draft" | "submitted",
              updatedAt: r.updated_at ? new Date(r.updated_at as string).toISOString() : new Date().toISOString(),
              submittedAt: r.submitted_at ? new Date(r.submitted_at as string).toISOString() : undefined,
            };
          }));
        }
        // Cargar misiones custom del docente para que el estudiante pueda resolverlas
        if (Array.isArray(data.missions)) {
          const customMissions: Mission[] = data.missions.map((row) => {
            const r = row as Record<string, unknown>;
            return {
              id: r.id as string,
              teacherId: r.teacher_id as string | undefined,
              title: r.title as string,
              summary: r.summary as string,
              category: r.category as Mission["category"],
              ageBand: r.age_band as Mission["ageBand"],
              durationMinutes: r.duration_minutes as number,
              outcomes: typeof r.outcomes === "string" ? JSON.parse(r.outcomes) : (r.outcomes as string[]),
              steps: typeof r.steps === "string" ? JSON.parse(r.steps) : (r.steps as Mission["steps"]),
              allowedCategories: typeof r.allowed_categories === "string" ? JSON.parse(r.allowed_categories) : (r.allowed_categories as Mission["allowedCategories"]),
              status: r.status as Mission["status"],
              coverTone: r.cover_tone as Mission["coverTone"],
            };
          });
          setMissions(mergeWithBaseMissions(customMissions));
        }
      }
    } catch { /* silencioso */ }
  }, []);

  useEffect(() => {
    let cancelled = false;

    // Docente y estudiante comparten las mismas listas en memoria (students, assignments…).
    // Si se restauraran las dos sesiones, la del estudiante (que puede venir de otra pestaña,
    // porque localStorage es compartido) reemplazaría el directorio del docente por un solo
    // estudiante. Por eso cada área restaura solo la sesión que le corresponde.
    const isStudentArea = window.location.pathname.startsWith("/estudiante");

    void (async () => {
      // Restore teacher session via cookie-authenticated endpoint
      if (!isStudentArea) try {
        const res = await fetch("/api/teacher/data");
        if (!cancelled && res.ok) {
          const data = await res.json() as {
            ok: boolean;
            students?: Student[];
            assignments?: Assignment[];
            studentWorks?: StudentWork[];
            profile?: TeacherProfile | null;
            missions?: Mission[];
          };
          if (data.ok) {
            setStudents(data.students ?? []);
            setAssignments(data.assignments ?? []);
            setStudentWorks(data.studentWorks ?? []);
            const uid = data.profile?.teacherId ?? data.profile?.id ?? "";
            if (uid) setTeacherId(uid);
            setProfile(data.profile ?? null);
            setMissions(mergeWithBaseMissions(data.missions ?? []));
          }
        }
        // If 401 — teacher is not logged in; silently continue
      } catch { /* ignore */ }

      // Restore student session from localStorage (solo en el área del estudiante)
      if (!cancelled && isStudentArea) {
        try {
          const stored = window.localStorage.getItem("esbot.studentSession.v1");
          if (stored) {
            const parsed = JSON.parse(stored) as { studentId: string; displayName: string; teacherId: string; expiresAt?: number };
            // Check expiration — clear session if expired
            if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
              window.localStorage.removeItem("esbot.studentSession.v1");
            } else if (parsed.studentId && parsed.teacherId) {
              setStudentSession({ studentId: parsed.studentId, displayName: parsed.displayName });
              await loadStudentData(parsed.teacherId, parsed.studentId);
            }
          }
        } catch { /* ignore */ }
      }

      if (!cancelled) setIsReady(true);
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── 5.2: loginWithPassword ───────────────────────────────────────────────────

  const loginWithPassword = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json() as { ok: boolean; message?: string; fullName?: string };
      if (!data.ok) return { ok: false, message: data.message ?? "No se pudo iniciar sesión." };

      // Session cookie is set by the server — load teacher data via cookie-authenticated endpoint
      await loadTeacherData(email);
      return { ok: true };
    } catch {
      return { ok: false, message: "No se pudo conectar al servidor." };
    }
  }, [loadTeacherData]);

  // ── 5.4: loginWithGoogle ─────────────────────────────────────────────────────

  const loginWithGoogle = useCallback(async (idToken: string): Promise<AuthResult> => {
    const { error } = await supabase.auth.signInWithIdToken({ provider: "google", token: idToken });
    if (error) {
      return { ok: false, message: "No se pudo iniciar sesión con Google." };
    }
    return { ok: true };
  }, []);

  // ── 5.6: logout ──────────────────────────────────────────────────────────────

  const logout = useCallback(async (scope: "teacher" | "student" = "teacher"): Promise<void> => {
    // Cada rol cierra solo su sesión: si un estudiante sale en un navegador donde también
    // hay un docente conectado, el docente no debe perder la suya (y al revés).
    if (scope === "student") {
      try { window.localStorage.removeItem("esbot.studentSession.v1"); } catch { /* ignore */ }
      setStudentSession(null);
      return;
    }
    // Clear the server-side session cookie
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch { /* ignore */ }
    // Remove legacy localStorage key (clean transition from old sessions)
    try { window.localStorage.removeItem("esbot.teacherSession.v1"); } catch { /* ignore */ }
    clearTeacherData();
  }, [clearTeacherData]);

  // ── 5.8: Student operations ──────────────────────────────────────────────────

  const addStudent = useCallback(async (input: StudentInput): Promise<{ ok: boolean; message?: string }> => {
    if (!teacherId) return { ok: false, message: "No hay sesión activa." };
    const newStudent: Student = {
      id: createId("student"),
      teacherId,
      institutionId: demoInstitution.id,
      courseId: input.courseId,
      fullName: input.fullName.trim(),
      email: input.email.trim().toLowerCase(),
      password: input.password,
      progress: "En curso",
      avatarUrl: input.avatarUrl,
      createdAt: new Date().toISOString(),
    };
    const result = await postJson("/api/student/create", newStudent);
    if (!result.ok) return { ok: false, message: result.offline ? "Sin conexión a internet: el estudiante no se guardó." : result.message };
    setStudents((current) => [newStudent, ...current]);
    return { ok: true };
  }, [teacherId]);

  const updateStudent = useCallback(async (studentId: string, input: StudentInput): Promise<{ ok: boolean; message?: string }> => {
    if (!teacherId) return { ok: false, message: "No hay sesión activa." };

    const current = await new Promise<Student[]>((resolve) => {
      setStudents((s) => { resolve(s); return s; });
    });
    const existing = current.find((s) => s.id === studentId);
    if (!existing) return { ok: false, message: "Estudiante no encontrado." };

    const updated: Student = {
      ...existing,
      courseId: input.courseId,
      fullName: input.fullName.trim(),
      email: input.email.trim().toLowerCase(),
      password: input.password || existing.password,
      avatarUrl: input.avatarUrl,
    };

    const payload: Record<string, unknown> = {
      id: updated.id,
      teacherId: updated.teacherId,
      institutionId: updated.institutionId,
      courseId: updated.courseId,
      fullName: updated.fullName,
      email: updated.email,
      progress: updated.progress,
      avatarUrl: updated.avatarUrl,
      createdAt: updated.createdAt,
    };
    // Only send newPassword if the user typed one — avoids double-hashing
    if (input.password) payload["newPassword"] = input.password;

    const result = await postJson("/api/student/create", payload);
    if (!result.ok) return { ok: false, message: result.offline ? "Sin conexión a internet: los cambios no se guardaron." : result.message };

    setStudents((s) => s.map((st) => st.id === studentId ? updated : st));
    return { ok: true };
  }, [teacherId]);

  const deleteStudent = useCallback(async (studentId: string): Promise<void> => {
    if (!teacherId) return;
    setStudents((current) => current.filter((s) => s.id !== studentId));
    const result = await postJson("/api/teacher/delete-student", { id: studentId });
    if (!result.ok) reportSyncFailure("No se pudo eliminar el estudiante", result);
  }, [teacherId, reportSyncFailure]);

  const importStudents = useCallback(async (importedStudents: ImportedStudent[]): Promise<{ added: number; skipped: string[] }> => {
    if (!teacherId) return { added: 0, skipped: [] };
    const existingEmails = new Set(students.map((s) => s.email.toLowerCase()));
    const skipped: string[] = [];
    const nextStudents: Student[] = [];

    for (const imported of importedStudents) {
      const course = demoCourses.find(
        (c) => c.name.toLowerCase() === imported.courseName.trim().toLowerCase()
      );
      if (!course) {
        skipped.push(`${imported.fullName}: curso "${imported.courseName}" no existe.`);
        continue;
      }
      if (existingEmails.has(imported.email.toLowerCase())) {
        skipped.push(`${imported.fullName}: correo duplicado.`);
        continue;
      }
      existingEmails.add(imported.email.toLowerCase());
      nextStudents.push({
        id: createId("student"),
        teacherId,
        institutionId: demoInstitution.id,
        courseId: course.id,
        fullName: imported.fullName,
        email: imported.email,
        password: "cambiar2026",
        progress: "En curso",
        createdAt: new Date().toISOString(),
      });
    }

    setStudents((current) => [...nextStudents, ...current]);
    const results = await Promise.all(nextStudents.map((s) => postJson("/api/student/create", s)));
    const failed = nextStudents.filter((_, index) => !results[index].ok);
    if (failed.length > 0) {
      const firstFailure = results.find((r) => !r.ok) as ApiFailure;
      reportSyncFailure(`No se pudieron guardar ${failed.length} de ${nextStudents.length} estudiantes importados`, firstFailure);
      skipped.push(...failed.map((s) => `${s.fullName}: no se pudo guardar (${firstFailure.offline ? "sin conexión" : firstFailure.message}).`));
    }
    return { added: nextStudents.length - failed.length, skipped };
  }, [teacherId, students, reportSyncFailure]);

  // ── 5.10: Assignment operations ──────────────────────────────────────────────

  const assignMission = useCallback(async (input: AssignMissionInput): Promise<void> => {
    if (!teacherId) return;
    const alreadyAssigned = assignments.some(
      (a) => a.missionId === input.missionId && a.courseId === input.courseId && a.status === "active"
    );
    if (alreadyAssigned) return;

    const newAssignment: Assignment = {
      id: createId("assignment"),
      teacherId,
      institutionId: demoInstitution.id,
      courseId: input.courseId,
      missionId: input.missionId,
      missionCode: createMissionCode(),
      instructions: input.instructions?.trim(),
      status: "active",
      assignedAt: new Date().toISOString(),
      assignedBy: profile?.id ?? teacherId,
      completedCount: 0,
      reviewCount: 0,
    };
    setAssignments((current) => [newAssignment, ...current]);
    const result = await postJson("/api/teacher/upsert-assignment", newAssignment);
    if (!result.ok) {
      reportSyncFailure("No se pudo asignar la misión", result);
      return;
    }

    const courseStudents = students
      .filter((student) => student.courseId === input.courseId)
      .map((student) => ({ ...student, currentMissionId: student.currentMissionId ?? input.missionId, progress: "En curso" as const }));
    setStudents((current) => current.map((student) => courseStudents.find((s) => s.id === student.id) ?? student));
    await Promise.all(courseStudents.map((s) =>
      postJson("/api/student/update-progress", { id: s.id, progress: s.progress, currentMissionId: s.currentMissionId })
    ));
  }, [teacherId, assignments, profile, students, reportSyncFailure]);

  const archiveAssignment = useCallback(async (assignmentId: string): Promise<void> => {
    if (!teacherId) return;
    const target = assignments.find((a) => a.id === assignmentId);
    if (!target) return;
    const archived = { ...target, status: "archived" as const };
    setAssignments((current) => current.map((a) => a.id === assignmentId ? archived : a));
    const result = await postJson("/api/teacher/upsert-assignment", archived);
    if (!result.ok) reportSyncFailure("No se pudo archivar la misión", result);
  }, [teacherId, assignments, reportSyncFailure]);

  const deleteAssignment = useCallback(async (assignmentId: string): Promise<void> => {
    if (!teacherId) return;
    // Find the course of this assignment to reset student progress in memory
    const assignment = assignments.find((a) => a.id === assignmentId);
    setAssignments((current) => current.filter((a) => a.id !== assignmentId));
    // Reset progress of students in that course
    if (assignment) {
      setStudents((current) => current.map((s) =>
        s.courseId === assignment.courseId && s.progress === "Revisar"
          ? { ...s, progress: "En curso" as const, currentMissionId: undefined }
          : s
      ));
    }
    const result = await postJson("/api/teacher/delete-assignment", { id: assignmentId });
    if (!result.ok) reportSyncFailure("No se pudo eliminar la misión asignada", result);
  }, [teacherId, assignments, reportSyncFailure]);

  // ── Misiones personalizadas ───────────────────────────────────────────────────

  const createMission = useCallback(async (input: CreateMissionInput): Promise<{ ok: boolean; message?: string }> => {
    if (!teacherId) return { ok: false, message: "No hay sesión activa." };
    const newMission: Mission = {
      id: createId("mission"),
      teacherId,
      status: "draft",
      title: input.title,
      summary: input.summary,
      category: input.category,
      ageBand: input.ageBand,
      durationMinutes: input.durationMinutes,
      outcomes: input.outcomes,
      steps: input.steps,
      solutionWorkspace: input.solutionWorkspace,
      allowedCategories: input.allowedCategories,
      coverTone: input.coverTone,
    };
    const result = await postJson("/api/teacher/create-mission", newMission);
    if (result.ok) {
      setMissions((prev) => [...prev, newMission]);
      return { ok: true };
    }
    return { ok: false, message: result.offline ? "Sin conexión a internet: la misión no se guardó." : result.message };
  }, [teacherId]);

  const editMission = useCallback(async (mission: Mission): Promise<{ ok: boolean; message?: string }> => {
    if (!teacherId) return { ok: false, message: "No hay sesión activa." };

    // Misión base: la primera edición crea la copia del docente; las siguientes la actualizan.
    // En pantalla sigue con el id base para que sus asignaciones no cambien (ver base-missions.ts).
    let result;
    let saved: Mission;
    if (isBaseMission(mission.id)) {
      const storageId = mission.storageId ?? baseOverrideId(mission.id, teacherId);
      const { storageId: _s, baseMissionId: _b, ...fields } = mission;
      const stored = { ...fields, id: storageId, teacherId, status: "published" as const };
      result = await postJson(mission.storageId ? "/api/teacher/update-mission" : "/api/teacher/create-mission", stored);
      saved = { ...stored, id: mission.id, storageId, baseMissionId: mission.id };
    } else {
      result = await postJson("/api/teacher/update-mission", mission);
      saved = mission;
    }

    if (result.ok) {
      setMissions((prev) => prev.map((m) => m.id === mission.id ? saved : m));
      return { ok: true };
    }
    return { ok: false, message: result.offline ? "Sin conexión a internet: los cambios no se guardaron." : result.message };
  }, [teacherId]);

  const deleteMission = useCallback(async (missionId: string): Promise<void> => {
    if (!teacherId) return;
    // Misión base editada: se borra la copia del docente y vuelve la original.
    const edited = missions.find((m) => m.id === missionId && m.storageId);
    const original = edited ? originalBaseMission(missionId) : undefined;
    if (edited && original) {
      setMissions((prev) => prev.map((m) => m.id === missionId ? original : m));
      const result = await postJson("/api/teacher/delete-mission", { id: edited.storageId });
      if (!result.ok) reportSyncFailure("No se pudo restaurar la misión original", result);
      return;
    }
    setMissions((prev) => prev.filter((m) => m.id !== missionId));
    const result = await postJson("/api/teacher/delete-mission", { id: missionId });
    if (!result.ok) reportSyncFailure("No se pudo eliminar la misión", result);
  }, [teacherId, missions, reportSyncFailure]);

  // ── 5.11: Student work operations ────────────────────────────────────────────

  const saveStudentWork = useCallback(async (input: SaveStudentWorkInput): Promise<SaveResult> => {
    // Obtener teacherId: del docente autenticado o de la sesión del estudiante
    const effectiveTeacherId = teacherId ?? (() => {
      try {
        const stored = window.localStorage.getItem("esbot.studentSession.v1");
        if (stored) return (JSON.parse(stored) as { teacherId: string }).teacherId;
      } catch { /* ignore */ }
      return null;
    })();
    if (!effectiveTeacherId) return { ok: false, message: "No hay sesión activa." };

    const updatedAt = new Date().toISOString();

    // Resolve the work object synchronously from the current ref so we have the id
    const existing = studentWorksRef.current.find(
      (w) => w.studentId === input.studentId && w.assignmentId === input.assignmentId
    );
    const work: StudentWork = existing
      ? {
          ...existing,
          workspaceState: input.workspaceState,
          stepIndex: input.stepIndex,
          status: existing.status === "submitted" ? "submitted" : "draft",
          updatedAt,
        }
      : {
          id: createId("work"),
          teacherId: effectiveTeacherId,
          institutionId: demoInstitution.id,
          studentId: input.studentId,
          assignmentId: input.assignmentId,
          missionId: input.missionId,
          workspaceState: input.workspaceState,
          stepIndex: input.stepIndex,
          status: "draft",
          updatedAt,
        };

    // Persistir primero: el estado local solo se actualiza si el servidor confirma,
    // para no mostrar como guardado algo que no llegó (la copia local la maneja useWorkAutosave).
    const result = await postJson("/api/student/save-work", {
      id: work.id,
      teacherId: effectiveTeacherId,
      institutionId: demoInstitution.id,
      studentId: input.studentId,
      assignmentId: input.assignmentId,
      missionId: input.missionId,
      workspaceState: input.workspaceState,
      stepIndex: input.stepIndex,
      updatedAt,
      status: work.status,
    });
    if (!result.ok) return { ok: false, offline: result.offline, message: result.message };

    setStudentWorks((current) =>
      current.some((w) => w.id === work.id)
        ? current.map((w) => w.id === work.id ? work : w)
        : [work, ...current]
    );
    return { ok: true };
  }, [teacherId]);

  const submitStudentWork = useCallback(async (input: SubmitStudentWorkInput): Promise<SaveResult> => {
    const effectiveTeacherId = teacherId ?? (() => {
      try {
        const stored = window.localStorage.getItem("esbot.studentSession.v1");
        if (stored) return (JSON.parse(stored) as { teacherId: string }).teacherId;
      } catch { /* ignore */ }
      return null;
    })();
    if (!effectiveTeacherId) return { ok: false, message: "No hay sesión activa." };

    const submittedAt = new Date().toISOString();
    const existing = studentWorksRef.current.find(
      (w) => w.studentId === input.studentId && w.assignmentId === input.assignmentId
    );
    const alreadySubmitted = existing?.status === "submitted";
    const work: StudentWork = existing
      ? { ...existing, workspaceState: input.workspaceState, stepIndex: input.stepIndex, status: "submitted", submittedAt, updatedAt: submittedAt }
      : {
          id: createId("work"),
          teacherId: effectiveTeacherId,
          institutionId: demoInstitution.id,
          studentId: input.studentId,
          assignmentId: input.assignmentId,
          missionId: input.missionId,
          workspaceState: input.workspaceState,
          stepIndex: input.stepIndex,
          status: "submitted",
          submittedAt,
          updatedAt: submittedAt,
        };

    // La entrega solo cuenta como enviada si el servidor confirma las dos escrituras.
    // Si una falla, el estudiante puede reintentar: ambas son idempotentes.
    const [saveResult, progressResult] = await Promise.all([
      postJson("/api/student/save-work", { ...input, id: work.id, teacherId: effectiveTeacherId, institutionId: demoInstitution.id, updatedAt: submittedAt, submittedAt, status: "submitted" }),
      postJson("/api/student/update-progress", { id: input.studentId, progress: "Revisar", currentMissionId: input.missionId }),
    ]);
    const failure = !saveResult.ok ? saveResult : !progressResult.ok ? progressResult : null;
    if (failure) return { ok: false, offline: failure.offline, message: failure.message };

    setStudentWorks((current) =>
      current.some((w) => w.id === work.id)
        ? current.map((w) => w.id === work.id ? work : w)
        : [work, ...current]
    );
    setStudents((current) =>
      current.map((student) =>
        student.id === input.studentId
          ? { ...student, progress: "Revisar" as const, currentMissionId: input.missionId }
          : student
      )
    );

    // El contador "por revisar" es informativo: si no se actualiza, la entrega igual quedó guardada.
    const assignment = assignments.find((a) => a.id === input.assignmentId);
    if (assignment && !alreadySubmitted) {
      const updated = { ...assignment, reviewCount: assignment.reviewCount + 1 };
      setAssignments((current) => current.map((a) => a.id === updated.id ? updated : a));
      void postJson("/api/teacher/upsert-assignment", updated);
    }
    return { ok: true };
  }, [teacherId, assignments]);

  // ── 5.12: Profile & student login ────────────────────────────────────────────

  const updateProfile = useCallback(async (input: ProfileInput): Promise<void> => {
    if (!teacherId || !profile) return;
    const updated: TeacherProfile = {
      ...profile,
      fullName: input.fullName.trim(),
      email: input.email.trim().toLowerCase(),
      biography: input.biography.trim(),
      avatarUrl: input.avatarUrl,
    };
    setProfile(updated);
    const result = await postJson("/api/teacher/update-profile", updated);
    if (!result.ok) reportSyncFailure("No se pudo guardar tu perfil", result);
  }, [teacherId, profile, reportSyncFailure]);

  const loginStudentWithPassword = useCallback(
    async (email: string, password: string): Promise<StudentLoginResult> => {
      try {
        const res = await fetch("/api/student/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json() as { ok: boolean; message?: string; studentId?: string; displayName?: string; teacherId?: string };
        if (!data.ok) return { ok: false, message: data.message };
        setStudentSession({ studentId: data.studentId!, displayName: data.displayName! });
        window.localStorage.setItem("esbot.studentSession.v1", JSON.stringify({ studentId: data.studentId, displayName: data.displayName, teacherId: data.teacherId, expiresAt: Date.now() + 2 * 60 * 60 * 1000 }));
        await loadStudentData(data.teacherId!, data.studentId!);
        return { ok: true };
      } catch {
        return { ok: false, message: "No se pudo conectar al servidor." };
      }
    },
    [loadStudentData]
  );

  const loginStudentWithMissionCode = useCallback(
    async (missionCode: string, studentName: string): Promise<StudentLoginResult> => {
      try {
        const res = await fetch("/api/student/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ missionCode, studentName }),
        });
        const data = await res.json() as { ok: boolean; message?: string; studentId?: string; displayName?: string; teacherId?: string };
        if (!data.ok) return { ok: false, message: data.message };
        setStudentSession({ studentId: data.studentId!, displayName: data.displayName! });
        window.localStorage.setItem("esbot.studentSession.v1", JSON.stringify({ studentId: data.studentId, displayName: data.displayName, teacherId: data.teacherId, expiresAt: Date.now() + 2 * 60 * 60 * 1000 }));
        await loadStudentData(data.teacherId!, data.studentId!);
        return { ok: true };
      } catch {
        return { ok: false, message: "No se pudo conectar al servidor." };
      }
    },
    [loadStudentData]
  );

  // ── Robot IP ──────────────────────────────────────────────────────────────────

  const setRobotIp = useCallback((ip: string) => {
    setRobotIpState(ip);
    try { window.localStorage.setItem("esbot.robotIp.v1", JSON.stringify(ip)); } catch { /* ignore */ }
  }, []);

  const deleteFreePlayProgress = useCallback(async (): Promise<void> => {
    if (!teacherId) return;
    setStudentWorks((current) => current.filter((w) => w.assignmentId !== FREE_PLAY_ASSIGNMENT_ID));
    const result = await postJson("/api/teacher/delete-free-play", { teacherId });
    if (!result.ok) reportSyncFailure("No se pudo eliminar el progreso de juego libre", result);
  }, [teacherId, reportSyncFailure]);

  // ── 5.13: Context value ───────────────────────────────────────────────────────

  const value = useMemo<AuthStore>(
    () => ({
      isReady,
      session,
      teacherId,
      studentSession,
      profile,
      institution: demoInstitution,
      courses: demoCourses,
      missions,
      students,
      assignments,
      studentWorks,
      robotIp,
      loginWithPassword,
      loginWithGoogle,
      logout,
      loginStudentWithPassword,
      loginStudentWithMissionCode,
      addStudent,
      updateStudent,
      deleteStudent,
      importStudents,
      assignMission,
      archiveAssignment,
      deleteAssignment,
      createMission,
      editMission,
      deleteMission,
      saveStudentWork,
      submitStudentWork,
      updateProfile,
      setRobotIp,
      deleteFreePlayProgress,
      syncError,
      clearSyncError,
      refreshTeacherData,
    }),
    [
      isReady,
      session,
      teacherId,
      studentSession,
      profile,
      missions,
      students,
      assignments,
      studentWorks,
      robotIp,
      loginWithPassword,
      loginWithGoogle,
      logout,
      loginStudentWithPassword,
      loginStudentWithMissionCode,
      addStudent,
      updateStudent,
      deleteStudent,
      importStudents,
      assignMission,
      archiveAssignment,
      deleteAssignment,
      createMission,
      editMission,
      deleteMission,
      saveStudentWork,
      submitStudentWork,
      updateProfile,
      setRobotIp,
      deleteFreePlayProgress,
      syncError,
      clearSyncError,
      refreshTeacherData,
    ]
  );

  return <AuthStoreContext.Provider value={value}>{children}</AuthStoreContext.Provider>;
}

// ── 5.13: useAuthStore hook ───────────────────────────────────────────────────

export function useAuthStore(): AuthStore {
  const store = useContext(AuthStoreContext);
  if (!store) {
    throw new Error("useAuthStore must be used inside AuthStoreProvider.");
  }
  return store;
}

/** Alias de compatibilidad para componentes que aún usan useDemoStore */
export const useDemoStore = useAuthStore;
