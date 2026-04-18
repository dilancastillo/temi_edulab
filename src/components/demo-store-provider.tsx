"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  demoAssignments,
  demoCourses,
  demoInstitution,
  demoMissions,
  demoStudentWorks,
  demoStudents,
  demoTeacherProfile
} from "@/lib/demo-data";
import {
  fetchStudents,
  fetchAssignments,
  fetchStudentWorks,
  fetchProfile,
  upsertStudent,
  upsertAssignment,
  upsertStudentWork,
  upsertProfile,
  deleteStudentById,
  deleteAssignmentById,
} from "@/lib/supabase-store";
import type {
  Assignment,
  AuthProvider,
  Course,
  ImportedStudent,
  Institution,
  Mission,
  ProfileInput,
  Session,
  Student,
  StudentInput,
  StudentLoginResult,
  StudentWork,
  TeacherProfile
} from "@/lib/types";

type AuthResult = {
  ok: boolean;
  message?: string;
};

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

type DemoStore = {
  isReady: boolean;
  institution: Institution;
  courses: Course[];
  missions: Mission[];
  students: Student[];
  assignments: Assignment[];
  studentWorks: StudentWork[];
  profile: TeacherProfile;
  session: Session | null;
  loginWithPassword: (email: string, password: string) => AuthResult;
  loginWithGoogle: (credential: string) => void;
  loginWithProvider: (provider: Extract<AuthProvider, "google" | "microsoft">) => void;
  loginStudentWithPassword: (email: string, password: string) => StudentLoginResult;
  loginStudentWithMissionCode: (missionCode: string, studentId: string) => StudentLoginResult;
  logout: () => void;
  addStudent: (input: StudentInput) => void;
  updateStudent: (studentId: string, input: StudentInput) => void;
  deleteStudent: (studentId: string) => void;
  importStudents: (students: ImportedStudent[]) => { added: number; skipped: string[] };
  assignMission: (input: AssignMissionInput) => void;
  archiveAssignment: (assignmentId: string) => void;
  deleteAssignment: (assignmentId: string) => void;
  saveStudentWork: (input: SaveStudentWorkInput) => void;
  submitStudentWork: (input: SubmitStudentWorkInput) => void;
  updateProfile: (input: ProfileInput) => void;
  resetDemoData: () => void;
  robotIp: string;
  setRobotIp: (ip: string) => void;
};

const DemoStoreContext = createContext<DemoStore | null>(null);

const storageKeys = {
  session: "esbot.session.v1",
  students: "esbot.students.v1",
  assignments: "esbot.assignments.v1",
  studentWorks: "esbot.studentWorks.v1",
  profile: "esbot.profile.v1",
  robotIp: "esbot.robotIp.v1"
};

const demoPassword = "demo2026";
const studentDemoPassword = "estudiante2026";

function readStoredValue<T>(key: string, fallback: T): T {
  const storage = getLocalStorage();
  if (!storage) return fallback;
  const rawValue = storage.getItem(key);
  if (!rawValue) return fallback;

  try {
    return JSON.parse(rawValue) as T;
  } catch {
    return fallback;
  }
}

function getLocalStorage() {
  if (typeof window === "undefined") return null;
  const storage = window.localStorage;

  if (
    !storage ||
    typeof storage.getItem !== "function" ||
    typeof storage.setItem !== "function" ||
    typeof storage.removeItem !== "function"
  ) {
    return null;
  }

  return storage;
}

function writeStoredValue(key: string, value: unknown) {
  const storage = getLocalStorage();
  storage?.setItem(key, JSON.stringify(value));
}

function removeStoredValue(key: string) {
  const storage = getLocalStorage();
  storage?.removeItem(key);
}

function createSession(provider: AuthProvider): Session {
  return {
    userId: demoTeacherProfile.id,
    institutionId: demoInstitution.id,
    role: "teacher",
    provider,
    displayName: demoTeacherProfile.fullName,
    email: demoTeacherProfile.email
  };
}

function createStudentSession(student: Student, provider: Extract<AuthProvider, "password" | "mission_code">): Session {
  return {
    userId: student.id,
    studentId: student.id,
    institutionId: student.institutionId,
    role: "student",
    provider,
    displayName: student.fullName,
    email: student.email
  };
}

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createMissionCode() {
  return Math.random().toString(36).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6).padEnd(6, "7");
}

export function DemoStoreProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [isReady, setIsReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [students, setStudents] = useState<Student[]>(demoStudents);
  const [assignments, setAssignments] = useState<Assignment[]>(demoAssignments);
  const [studentWorks, setStudentWorks] = useState<StudentWork[]>(demoStudentWorks);
  const [profile, setProfile] = useState<TeacherProfile>(demoTeacherProfile);
  const [robotIp, setRobotIpState] = useState<string>("");

  useEffect(() => {
    const abortController = new AbortController();

    async function loadFromSupabase() {
      if (abortController.signal.aborted) return;

      const [remoteStudents, remoteAssignments, remoteWorks, remoteProfile] = await Promise.all([
        fetchStudents(demoTeacherProfile.teacherId),
        fetchAssignments(demoTeacherProfile.teacherId),
        fetchStudentWorks(demoTeacherProfile.teacherId),
        fetchProfile(demoTeacherProfile.teacherId),
      ]);

      if (abortController.signal.aborted) return;

      setStudents(remoteStudents.length > 0 ? remoteStudents : demoStudents);
      setAssignments(remoteAssignments.length > 0 ? remoteAssignments : demoAssignments);
      setStudentWorks(remoteWorks.length > 0 ? remoteWorks : demoStudentWorks);
      setProfile(remoteProfile ?? demoTeacherProfile);
      setSession(readStoredValue<Session | null>(storageKeys.session, null));
      setRobotIpState(readStoredValue(storageKeys.robotIp, process.env.NEXT_PUBLIC_ROBOT_API_URL ?? "http://192.168.10.64:8765"));
      setIsReady(true);
    }

    void loadFromSupabase();
    return () => abortController.abort();
  }, []);

  useEffect(() => {
    if (!isReady) return;
    if (session) {
      writeStoredValue(storageKeys.session, session);
    } else {
      removeStoredValue(storageKeys.session);
    }
  }, [isReady, session]);

  // Students, assignments, studentWorks, profile are synced to Supabase directly in each action

  const setRobotIp = useCallback((ip: string) => {
    setRobotIpState(ip);
    writeStoredValue(storageKeys.robotIp, ip);
  }, []);

  const loginWithPassword = useCallback((email: string, password: string) => {
    const normalisedEmail = email.trim().toLowerCase();

    if (normalisedEmail !== demoTeacherProfile.email || password !== demoPassword) {
      return {
        ok: false,
        message: "Usa profesor@esbot.test con la clave demo2026 para entrar al modo local."
      };
    }

    setSession(createSession("password"));
    return { ok: true };
  }, []);

  const loginWithGoogle = useCallback((credential: string) => {
    try {
      const payload = JSON.parse(atob(credential.split(".")[1]));
      const email = payload.email ?? "";
      const name = payload.name ?? "Profesor Google";
      const picture = payload.picture ?? "";
      
      setSession({
        userId: `google-${payload.sub}`,
        institutionId: demoInstitution.id,
        role: "teacher",
        provider: "google",
        displayName: name,
        email: email
      });

      setProfile((current) => ({
        ...current,
        fullName: name,
        email: email,
        avatarUrl: picture || current.avatarUrl
      }));
    } catch {
      console.error("Error al procesar credencial de Google");
    }
  }, []);

  const loginWithProvider = useCallback((provider: Extract<AuthProvider, "google" | "microsoft">) => {
    setSession(createSession(provider));
  }, []);

  const loginStudentWithPassword = useCallback(
    (email: string, password: string) => {
      const normalisedEmail = email.trim().toLowerCase();
      const student = students.find((candidate) => candidate.email.toLowerCase() === normalisedEmail);

      if (!student || password !== studentDemoPassword) {
        return {
          ok: false,
          message: "Usa un correo de estudiante demo con la clave estudiante2026."
        };
      }

      setSession(createStudentSession(student, "password"));
      return { ok: true };
    },
    [students]
  );

  const loginStudentWithMissionCode = useCallback(
    (missionCode: string, studentId: string) => {
      const student = students.find((candidate) => candidate.id === studentId);
      const normalisedCode = missionCode.trim().toUpperCase();
      const assignment = assignments.find(
        (candidate) =>
          student &&
          candidate.status === "active" &&
          candidate.courseId === student.courseId &&
          candidate.missionCode.toUpperCase() === normalisedCode
      );

      if (!student || !assignment) {
        return {
          ok: false,
          message: "El código no coincide con una misión activa para ese estudiante."
        };
      }

      setSession(createStudentSession(student, "mission_code"));
      return { ok: true };
    },
    [assignments, students]
  );

  const logout = useCallback(() => {
    setSession(null);
    setProfile(demoTeacherProfile);
  }, []);

  const addStudent = useCallback((input: StudentInput) => {
    const newStudent: Student = {
      id: createId("student"),
      teacherId: "teacher-demo",
      institutionId: demoInstitution.id,
      courseId: input.courseId,
      fullName: input.fullName.trim(),
      email: input.email.trim().toLowerCase(),
      progress: "En curso",
      avatarUrl: input.avatarUrl,
      createdAt: new Date().toISOString()
    };
    setStudents((current) => [newStudent, ...current]);
    void upsertStudent(newStudent);
  }, []);

  const updateStudent = useCallback((studentId: string, input: StudentInput) => {
    setStudents((current) => {
      const updated = current.map((student) =>
        student.id === studentId
          ? { ...student, courseId: input.courseId, fullName: input.fullName.trim(), email: input.email.trim().toLowerCase(), avatarUrl: input.avatarUrl }
          : student
      );
      const s = updated.find((s) => s.id === studentId);
      if (s) void upsertStudent(s);
      return updated;
    });
  }, []);

  const deleteStudent = useCallback((studentId: string) => {
    setStudents((current) => current.filter((student) => student.id !== studentId));
    void deleteStudentById(studentId);
  }, []);

  const importStudents = useCallback((importedStudents: ImportedStudent[]) => {
    const existingEmails = new Set(students.map((student) => student.email.toLowerCase()));
    const skipped: string[] = [];
    const nextStudents: Student[] = [];

    for (const importedStudent of importedStudents) {
      const course = demoCourses.find(
        (candidate) => candidate.name.toLowerCase() === importedStudent.courseName.trim().toLowerCase()
      );

      if (!course) {
        skipped.push(`${importedStudent.fullName}: curso "${importedStudent.courseName}" no existe.`);
        continue;
      }

      if (existingEmails.has(importedStudent.email)) {
        skipped.push(`${importedStudent.fullName}: correo duplicado.`);
        continue;
      }

      existingEmails.add(importedStudent.email);
      nextStudents.push({
        id: createId("student"),
        teacherId: "teacher-demo",
        institutionId: demoInstitution.id,
        courseId: course.id,
        fullName: importedStudent.fullName,
        email: importedStudent.email,
        progress: "En curso",
        createdAt: new Date().toISOString()
      });
    }

    setStudents((current) => [...nextStudents, ...current]);
    nextStudents.forEach((s) => void upsertStudent(s));
    return { added: nextStudents.length, skipped };
  }, [students]);

  const assignMission = useCallback(
    (input: AssignMissionInput) => {
      // Evitar asignar la misma misión dos veces al mismo curso
      const alreadyAssigned = assignments.some(
        (a) => a.missionId === input.missionId && a.courseId === input.courseId && a.status === "active"
      );
      if (alreadyAssigned) return;

      const newAssignment: Assignment = {
        id: createId("assignment"),
        teacherId: "teacher-demo",
        institutionId: demoInstitution.id,
        courseId: input.courseId,
        missionId: input.missionId,
        missionCode: createMissionCode(),
        instructions: input.instructions?.trim(),
        status: "active",
        assignedAt: new Date().toISOString(),
        assignedBy: profile.id,
        completedCount: 0,
        reviewCount: 0
      };
      setAssignments((current) => [newAssignment, ...current]);
      void upsertAssignment(newAssignment);

      setStudents((current) =>
        current.map((student) => {
          if (student.courseId !== input.courseId) return student;
          const updated = { ...student, currentMissionId: student.currentMissionId ?? input.missionId, progress: "En curso" as const };
          void upsertStudent(updated);
          return updated;
        })
      );
    },
    [assignments, profile.id]
  );

  const archiveAssignment = useCallback((assignmentId: string) => {
    setAssignments((current) => {
      const updated = current.map((a) => a.id === assignmentId ? { ...a, status: "archived" as const } : a);
      const a = updated.find((a) => a.id === assignmentId);
      if (a) void upsertAssignment(a);
      return updated;
    });
  }, []);

  const deleteAssignment = useCallback((assignmentId: string) => {
    setAssignments((current) => current.filter((a) => a.id !== assignmentId));
    void deleteAssignmentById(assignmentId);
  }, []);

  const saveStudentWork = useCallback((input: SaveStudentWorkInput) => {
    setStudentWorks((current) => {
      const existing = current.find((w) => w.studentId === input.studentId && w.assignmentId === input.assignmentId);
      let updated: StudentWork[];
      if (existing) {
        const work = { ...existing, workspaceState: input.workspaceState, stepIndex: input.stepIndex, status: existing.status === "submitted" ? "submitted" as const : "draft" as const, updatedAt: new Date().toISOString() };
        updated = current.map((w) => w.id === existing.id ? work : w);
        void upsertStudentWork(work);
      } else {
        const work: StudentWork = { id: createId("work"), teacherId: "teacher-demo", institutionId: demoInstitution.id, studentId: input.studentId, assignmentId: input.assignmentId, missionId: input.missionId, workspaceState: input.workspaceState, stepIndex: input.stepIndex, status: "draft", updatedAt: new Date().toISOString() };
        updated = [work, ...current];
        void upsertStudentWork(work);
      }
      return updated;
    });
  }, []);

  const submitStudentWork = useCallback(
    (input: SubmitStudentWorkInput) => {
      const submittedAt = new Date().toISOString();

      setStudentWorks((current) => {
        const existing = current.find((w) => w.studentId === input.studentId && w.assignmentId === input.assignmentId);
        let updated: StudentWork[];
        if (existing) {
          const work = { ...existing, workspaceState: input.workspaceState, stepIndex: input.stepIndex, status: "submitted" as const, submittedAt, updatedAt: submittedAt };
          updated = current.map((w) => w.id === existing.id ? work : w);
          void upsertStudentWork(work);
        } else {
          const work: StudentWork = { id: createId("work"), teacherId: "teacher-demo", institutionId: demoInstitution.id, studentId: input.studentId, assignmentId: input.assignmentId, missionId: input.missionId, workspaceState: input.workspaceState, stepIndex: input.stepIndex, status: "submitted", submittedAt, updatedAt: submittedAt };
          updated = [work, ...current];
          void upsertStudentWork(work);
        }
        return updated;
      });

      setStudents((current) =>
        current.map((student) => {
          if (student.id !== input.studentId) return student;
          const updated = { ...student, progress: "Revisar" as const, currentMissionId: input.missionId };
          void upsertStudent(updated);
          return updated;
        })
      );

      setAssignments((current) =>
        current.map((assignment) => {
          if (assignment.id !== input.assignmentId) return assignment;
          const alreadySubmitted = studentWorks.some((w) => w.studentId === input.studentId && w.assignmentId === input.assignmentId && w.status === "submitted");
          const updated = { ...assignment, reviewCount: alreadySubmitted ? assignment.reviewCount : assignment.reviewCount + 1 };
          void upsertAssignment(updated);
          return updated;
        })
      );
    },
    [studentWorks]
  );

  const updateProfile = useCallback((input: ProfileInput) => {
    setProfile((current) => {
      const updated = { ...current, fullName: input.fullName.trim(), email: input.email.trim().toLowerCase(), biography: input.biography.trim(), avatarUrl: input.avatarUrl };
      void upsertProfile(updated);
      return updated;
    });
  }, []);

  const resetDemoData = useCallback(() => {
    setSession(null);
    setStudents(demoStudents);
    setAssignments(demoAssignments);
    setStudentWorks(demoStudentWorks);
    setProfile(demoTeacherProfile);
    Object.values(storageKeys).forEach((key) => removeStoredValue(key));
  }, []);

  const value = useMemo<DemoStore>(
    () => ({
      isReady,
      institution: demoInstitution,
      courses: demoCourses,
      missions: demoMissions,
      students,
      assignments,
      studentWorks,
      profile,
      session,
      loginWithPassword,
      loginWithGoogle,
      loginWithProvider,
      loginStudentWithPassword,
      loginStudentWithMissionCode,
      logout,
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
      resetDemoData,
      robotIp,
      setRobotIp
    }),
    [
      addStudent,
      archiveAssignment,
      assignMission,
      assignments,
      deleteAssignment,
      deleteStudent,
      importStudents,
      isReady,
      loginWithPassword,
      loginWithGoogle,
      loginWithProvider,
      loginStudentWithMissionCode,
      loginStudentWithPassword,
      logout,
      profile,
      resetDemoData,
      robotIp,
      saveStudentWork,
      session,
      setRobotIp,
      studentWorks,
      students,
      submitStudentWork,
      updateProfile,
      updateStudent
    ]
  );

  return <DemoStoreContext.Provider value={value}>{children}</DemoStoreContext.Provider>;
}

export function useDemoStore() {
  const store = useContext(DemoStoreContext);

  if (!store) {
    throw new Error("useDemoStore must be used inside DemoStoreProvider.");
  }

  return store;
}
