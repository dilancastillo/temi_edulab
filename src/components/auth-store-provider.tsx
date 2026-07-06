"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Session as SupabaseSession } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
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
  logout: () => Promise<void>;

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

  // Trabajos
  saveStudentWork: (input: SaveStudentWorkInput) => Promise<void>;
  submitStudentWork: (input: SubmitStudentWorkInput) => Promise<void>;

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
        setMissions([...demoMissions, ...(data.missions ?? [])]);
        if (uid) setTeacherId(uid);
      }
    } catch { /* ignore */ }
    setIsReady(true);
  }, []);

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
          setMissions([...demoMissions, ...customMissions]);
        }
      }
    } catch { /* silencioso */ }
  }, []);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      // Restore teacher session via cookie-authenticated endpoint
      try {
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
            setMissions([...demoMissions, ...(data.missions ?? [])]);
          }
        }
        // If 401 — teacher is not logged in; silently continue
      } catch { /* ignore */ }

      // Restore student session from localStorage (student sessions are unaffected)
      if (!cancelled) {
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

  const logout = useCallback(async (): Promise<void> => {
    // Clear the server-side session cookie
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch { /* ignore */ }
    // Remove legacy localStorage key (clean transition from old sessions)
    try { window.localStorage.removeItem("esbot.teacherSession.v1"); } catch { /* ignore */ }
    window.localStorage.removeItem("esbot.studentSession.v1");
    clearTeacherData();
    setStudentSession(null);
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
    const res = await fetch("/api/student/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newStudent),
    });
    const data = await res.json() as { ok: boolean; message?: string };
    if (!data.ok) return { ok: false, message: data.message };
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

    const res = await fetch("/api/student/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json() as { ok: boolean; message?: string };
    if (!data.ok) return { ok: false, message: data.message };

    setStudents((s) => s.map((st) => st.id === studentId ? updated : st));
    return { ok: true };
  }, [teacherId]);

  const deleteStudent = useCallback(async (studentId: string): Promise<void> => {
    if (!teacherId) return;
    setStudents((current) => current.filter((s) => s.id !== studentId));
    await fetch("/api/teacher/delete-student", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: studentId }),
    });
  }, [teacherId]);

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
    await Promise.all(nextStudents.map((s) => fetch("/api/student/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(s),
    })));
    return { added: nextStudents.length, skipped };
  }, [teacherId, students]);

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
    await fetch("/api/teacher/upsert-assignment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newAssignment),
    });

    setStudents((current) =>
      current.map((student) => {
        if (student.courseId !== input.courseId) return student;
        const updated = { ...student, currentMissionId: student.currentMissionId ?? input.missionId, progress: "En curso" as const };
        void fetch("/api/student/update-progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: updated.id, progress: updated.progress, currentMissionId: updated.currentMissionId }),
        });
        return updated;
      })
    );
  }, [teacherId, assignments, profile]);

  const archiveAssignment = useCallback(async (assignmentId: string): Promise<void> => {
    if (!teacherId) return;
    setAssignments((current) => {
      const updated = current.map((a) => a.id === assignmentId ? { ...a, status: "archived" as const } : a);
      const a = updated.find((a) => a.id === assignmentId);
      if (a) void fetch("/api/teacher/upsert-assignment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(a),
      });
      return updated;
    });
  }, [teacherId]);

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
    await fetch("/api/teacher/delete-assignment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: assignmentId }),
    });
  }, [teacherId, assignments]);

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
      allowedCategories: input.allowedCategories,
      coverTone: input.coverTone,
    };
    const res = await fetch("/api/teacher/create-mission", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newMission),
    });
    const data = await res.json() as { ok: boolean; message?: string };
    if (data.ok) {
      setMissions((prev) => [...prev, newMission]);
      return { ok: true };
    }
    return { ok: false, message: data.message ?? "Error al guardar la misión." };
  }, [teacherId]);

  const editMission = useCallback(async (mission: Mission): Promise<{ ok: boolean; message?: string }> => {
    if (!teacherId) return { ok: false, message: "No hay sesión activa." };
    const res = await fetch("/api/teacher/update-mission", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(mission),
    });
    const data = await res.json() as { ok: boolean; message?: string };
    if (data.ok) {
      setMissions((prev) => prev.map((m) => m.id === mission.id ? mission : m));
      return { ok: true };
    }
    return { ok: false, message: data.message ?? "Error al actualizar la misión." };
  }, [teacherId]);

  const deleteMission = useCallback(async (missionId: string): Promise<void> => {
    if (!teacherId) return;
    setMissions((prev) => prev.filter((m) => m.id !== missionId));
    await fetch("/api/teacher/delete-mission", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: missionId }),
    });
  }, [teacherId]);

  // ── 5.11: Student work operations ────────────────────────────────────────────

  const saveStudentWork = useCallback(async (input: SaveStudentWorkInput): Promise<void> => {
    // Obtener teacherId: del docente autenticado o de la sesión del estudiante
    const effectiveTeacherId = teacherId ?? (() => {
      try {
        const stored = window.localStorage.getItem("esbot.studentSession.v1");
        if (stored) return (JSON.parse(stored) as { teacherId: string }).teacherId;
      } catch { /* ignore */ }
      return null;
    })();
    if (!effectiveTeacherId) return;

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

    setStudentWorks((current) =>
      existing
        ? current.map((w) => w.id === existing.id ? work : w)
        : [work, ...current]
    );

    // Usar API route para persistir (funciona tanto para docente como estudiante)
    // Incluir el id para que Supabase pueda hacer upsert por PK correctamente
    await fetch("/api/student/save-work", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
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
      }),
    });
  }, [teacherId]);

  const submitStudentWork = useCallback(async (input: SubmitStudentWorkInput): Promise<void> => {
    const effectiveTeacherId = teacherId ?? (() => {
      try {
        const stored = window.localStorage.getItem("esbot.studentSession.v1");
        if (stored) return (JSON.parse(stored) as { teacherId: string }).teacherId;
      } catch { /* ignore */ }
      return null;
    })();
    if (!effectiveTeacherId) return;

    const submittedAt = new Date().toISOString();
    let workId: string | null = null;

    setStudentWorks((current) => {
      const existing = current.find((w) => w.studentId === input.studentId && w.assignmentId === input.assignmentId);
      let work: StudentWork;
      if (existing) {
        workId = existing.id;
        work = { ...existing, workspaceState: input.workspaceState, stepIndex: input.stepIndex, status: "submitted", submittedAt, updatedAt: submittedAt };
        return current.map((w) => w.id === existing.id ? work : w);
      } else {
        workId = createId("work");
        work = {
          id: workId,
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
        return [work, ...current];
      }
    });

    // Esperar a que save-work y update-progress persistan antes de que el componente haga router.refresh()
    await Promise.all([
      fetch("/api/student/save-work", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...input, id: workId, teacherId: effectiveTeacherId, institutionId: demoInstitution.id, updatedAt: submittedAt, submittedAt, status: "submitted" }),
      }),
      fetch("/api/student/update-progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: input.studentId, progress: "Revisar", currentMissionId: input.missionId }),
      }),
    ]);

    setStudents((current) =>
      current.map((student) => {
        if (student.id !== input.studentId) return student;
        return { ...student, progress: "Revisar" as const, currentMissionId: input.missionId };
      })
    );

    setAssignments((current) =>
      current.map((assignment) => {
        if (assignment.id !== input.assignmentId) return assignment;
        const alreadySubmitted = studentWorksRef.current.some(
          (w) => w.studentId === input.studentId && w.assignmentId === input.assignmentId && w.status === "submitted"
        );
        const updated = { ...assignment, reviewCount: alreadySubmitted ? assignment.reviewCount : assignment.reviewCount + 1 };
        void fetch("/api/teacher/upsert-assignment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updated),
        });
        return updated;
      })
    );
  }, [teacherId]);

  // ── 5.12: Profile & student login ────────────────────────────────────────────

  const updateProfile = useCallback(async (input: ProfileInput): Promise<void> => {
    if (!teacherId) return;
    setProfile((current) => {
      if (!current) return current;
      const updated: TeacherProfile = {
        ...current,
        fullName: input.fullName.trim(),
        email: input.email.trim().toLowerCase(),
        biography: input.biography.trim(),
        avatarUrl: input.avatarUrl,
      };
      void fetch("/api/teacher/update-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
      return updated;
    });
  }, [teacherId]);

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
    await fetch("/api/teacher/delete-free-play", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teacherId }),
    });
  }, [teacherId]);

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
