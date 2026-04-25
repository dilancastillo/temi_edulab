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
  addStudent: (input: StudentInput) => Promise<void>;
  updateStudent: (studentId: string, input: StudentInput) => Promise<void>;
  deleteStudent: (studentId: string) => Promise<void>;
  importStudents: (students: ImportedStudent[]) => Promise<{ added: number; skipped: string[] }>;

  // Asignaciones
  assignMission: (input: AssignMissionInput) => Promise<void>;
  archiveAssignment: (assignmentId: string) => Promise<void>;
  deleteAssignment: (assignmentId: string) => Promise<void>;

  // Trabajos
  saveStudentWork: (input: SaveStudentWorkInput) => Promise<void>;
  submitStudentWork: (input: SubmitStudentWorkInput) => Promise<void>;

  // Perfil
  updateProfile: (input: ProfileInput) => Promise<void>;

  // Robot
  setRobotIp: (ip: string) => void;
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
  const [students, setStudents] = useState<Student[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [studentWorks, setStudentWorks] = useState<StudentWork[]>([]);
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [robotIp, setRobotIpState] = useState<string>(() => getRobotIpDefault());

  // Keep a ref to studentWorks for use inside callbacks without stale closure
  const studentWorksRef = useRef(studentWorks);
  useEffect(() => { studentWorksRef.current = studentWorks; }, [studentWorks]);

  // ── 5.1: Auth state subscription + session restore ──────────────────────────

  const loadTeacherData = useCallback(async (uid: string, userEmail: string) => {
    try {
      const res = await fetch(`/api/teacher/data?teacherId=${uid}`);
      const data = await res.json() as {
        ok: boolean;
        students?: Student[];
        assignments?: Assignment[];
        studentWorks?: StudentWork[];
        profile?: TeacherProfile | null;
      };
      if (data.ok) {
        setStudents(data.students ?? []);
        setAssignments(data.assignments ?? []);
        setStudentWorks(data.studentWorks ?? []);
        setProfile(data.profile ?? buildDefaultProfile(uid, userEmail));
      }
    } catch { /* ignore */ }
    setTeacherId(uid);
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
      const res = await fetch(`/api/student/data?teacherId=${teacherId}&studentId=${studentId}`);
      const data = await res.json() as { ok: boolean; student?: Record<string, unknown>; assignments?: unknown[]; studentWorks?: unknown[] };
      if (data.ok) {
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
      }
    } catch { /* silencioso */ }
  }, []);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      // Restaurar sesión del docente desde localStorage
      try {
        const stored = window.localStorage.getItem("esbot.teacherSession.v1");
        if (stored && !cancelled) {
          const parsed = JSON.parse(stored) as { teacherId: string; email: string };
          if (parsed.teacherId) {
            await loadTeacherData(parsed.teacherId, parsed.email);
          }
        }
      } catch { /* ignore */ }

      // Restaurar sesión del estudiante desde localStorage
      if (!cancelled) {
        try {
          const stored = window.localStorage.getItem("esbot.studentSession.v1");
          if (stored) {
            const parsed = JSON.parse(stored) as { studentId: string; displayName: string; teacherId: string };
            if (parsed.studentId && parsed.teacherId) {
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
      const data = await res.json() as { ok: boolean; message?: string; teacherId?: string; email?: string; fullName?: string; institutionId?: string };
      if (!data.ok) return { ok: false, message: data.message ?? "No se pudo iniciar sesión." };

      // Store session in localStorage
      window.localStorage.setItem("esbot.teacherSession.v1", JSON.stringify({
        teacherId: data.teacherId,
        email: data.email,
        fullName: data.fullName,
        institutionId: data.institutionId,
      }));

      await loadTeacherData(data.teacherId!, data.email!);
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
    window.localStorage.removeItem("esbot.teacherSession.v1");
    window.localStorage.removeItem("esbot.studentSession.v1");
    clearTeacherData();
    setStudentSession(null);
  }, [clearTeacherData]);

  // ── 5.8: Student operations ──────────────────────────────────────────────────

  const addStudent = useCallback(async (input: StudentInput): Promise<void> => {
    if (!teacherId) return;
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
    setStudents((current) => [newStudent, ...current]);
    // Use server endpoint to hash password before storing
    await fetch("/api/student/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newStudent),
    });
  }, [teacherId]);

  const updateStudent = useCallback(async (studentId: string, input: StudentInput): Promise<void> => {
    if (!teacherId) return;
    setStudents((current) => {
      const updated = current.map((s) =>
        s.id === studentId
          ? {
              ...s,
              courseId: input.courseId,
              fullName: input.fullName.trim(),
              email: input.email.trim().toLowerCase(),
              password: input.password || s.password,
              avatarUrl: input.avatarUrl
            }
          : s
      );
      const s = updated.find((s) => s.id === studentId);
      if (s) {
        // Use server endpoint to hash password before storing
        void fetch("/api/student/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(s),
        });
      }
      return updated;
    });
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
    void fetch("/api/student/save-work", {
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

    void fetch("/api/student/save-work", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...input, id: workId, teacherId: effectiveTeacherId, institutionId: demoInstitution.id, updatedAt: submittedAt, submittedAt, status: "submitted" }),
    });

    setStudents((current) =>
      current.map((student) => {
        if (student.id !== input.studentId) return student;
        const updated = { ...student, progress: "Revisar" as const, currentMissionId: input.missionId };
        void fetch("/api/student/update-progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: updated.id, progress: updated.progress, currentMissionId: updated.currentMissionId }),
        });
        return updated;
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
        window.localStorage.setItem("esbot.studentSession.v1", JSON.stringify({ studentId: data.studentId, displayName: data.displayName, teacherId: data.teacherId }));
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
        window.localStorage.setItem("esbot.studentSession.v1", JSON.stringify({ studentId: data.studentId, displayName: data.displayName, teacherId: data.teacherId }));
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
      missions: demoMissions,
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
      saveStudentWork,
      submitStudentWork,
      updateProfile,
      setRobotIp,
    }),
    [
      isReady,
      session,
      teacherId,
      studentSession,
      profile,
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
      saveStudentWork,
      submitStudentWork,
      updateProfile,
      setRobotIp,
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
