"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { emptyBootstrap } from "@/lib/empty-bootstrap";
import type {
  AppBootstrap,
  Assignment,
  AuthProvider,
  ClassSession,
  Course,
  ImportedStudent,
  Institution,
  Mission,
  PairingRequest,
  ProfileInput,
  Robot,
  WorkshopCheckpoint,
  WorkshopDeviceMode,
  WorkshopExecutionMode,
  WorkshopParticipationMode,
  WorkshopStudentMode,
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

type WorkshopConfigInput = {
  missionType: "classroom_guide";
  workshopName: string;
  studentMode: WorkshopStudentMode;
  participationMode: WorkshopParticipationMode;
  deviceMode: WorkshopDeviceMode;
  executionMode: WorkshopExecutionMode;
  turnDurationMinutes: number;
  baseLocationName: string;
  routeSafeConfirmed: boolean;
  executionModeConfirmed: boolean;
  checkpoints: WorkshopCheckpoint[];
};

type SaveStudentWorkInput = {
  studentId: string;
  assignmentId: string;
  missionId: string;
  workspaceState: unknown;
  stepIndex: number;
};

type SubmitStudentWorkInput = SaveStudentWorkInput;

type CreateClassSessionInput = {
  assignmentId: string;
  robotId: string;
  activeStudentName?: string;
  workshop?: WorkshopConfigInput;
};

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
  robots: Robot[];
  classSessions: ClassSession[];
  pairingRequests: PairingRequest[];
  loginWithPassword: (email: string, password: string) => Promise<AuthResult>;
  loginWithProvider: (provider: Extract<AuthProvider, "google" | "microsoft">) => AuthResult;
  loginStudentWithPassword: (email: string, password: string) => Promise<StudentLoginResult>;
  loginStudentWithMissionCode: (missionCode: string, email: string) => Promise<StudentLoginResult>;
  logout: () => Promise<void>;
  addStudent: (input: StudentInput) => Promise<void>;
  updateStudent: (studentId: string, input: StudentInput) => Promise<void>;
  deleteStudent: (studentId: string) => Promise<void>;
  importStudents: (students: ImportedStudent[]) => Promise<{ added: number; skipped: string[] }>;
  assignMission: (input: AssignMissionInput) => Promise<Assignment>;
  archiveAssignment: (assignmentId: string) => Promise<void>;
  deleteAssignment: (assignmentId: string) => Promise<void>;
  saveStudentWork: (input: SaveStudentWorkInput) => Promise<void>;
  submitStudentWork: (input: SubmitStudentWorkInput) => Promise<void>;
  updateProfile: (input: ProfileInput) => Promise<void>;
  createClassSession: (input: CreateClassSessionInput) => Promise<ClassSession>;
  approveClassSession: (classSessionId: string) => Promise<ClassSession>;
  confirmPairingRequest: (pairingRequestId: string, input: { assignedName: string; classroomName: string; courseId: string }) => Promise<void>;
  resetDemoData: () => Promise<void>;
  refreshData: () => Promise<void>;
};

type ErrorPayload = {
  message?: string;
};

const DemoStoreContext = createContext<DemoStore | null>(null);

async function parseResponse<T>(response: Response) {
  if (!response.ok) {
    let message = "No pudimos completar la solicitud.";

    try {
      const payload = (await response.json()) as ErrorPayload;
      if (payload.message) {
        message = payload.message;
      }
    } catch {
      // Keep the default message.
    }

    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const responseType = response.headers.get("content-type") ?? "";
  if (!responseType.includes("application/json")) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

async function fetchJson<T>(input: RequestInfo, init?: RequestInit) {
  const hasBody = init?.body !== undefined && init.body !== null;
  const response = await fetch(input, {
    ...init,
    headers: hasBody
      ? {
          "content-type": "application/json",
          ...(init?.headers ?? {})
        }
      : init?.headers
  });

  return parseResponse<T>(response);
}

export function DemoStoreProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [isReady, setIsReady] = useState(false);
  const [bootstrap, setBootstrap] = useState<AppBootstrap>(emptyBootstrap);

  const refreshData = useCallback(async () => {
    const nextBootstrap = await fetchJson<AppBootstrap>("/api/bootstrap");
    setBootstrap(nextBootstrap);
  }, []);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const nextBootstrap = await fetchJson<AppBootstrap>("/api/bootstrap");
        if (!cancelled) {
          setBootstrap(nextBootstrap);
        }
      } catch {
        if (!cancelled) {
          setBootstrap(emptyBootstrap);
        }
      } finally {
        if (!cancelled) {
          setIsReady(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const loginWithPassword = useCallback(async (email: string, password: string) => {
    try {
      const nextBootstrap = await fetchJson<AppBootstrap>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });

      setBootstrap(nextBootstrap);
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : "No se pudo iniciar sesion."
      };
    }
  }, []);

  const loginWithProvider = useCallback((provider: Extract<AuthProvider, "google" | "microsoft">) => {
    const providerName = provider === "google" ? "Google" : "Microsoft";
    return {
      ok: false,
      message: `El acceso con ${providerName} queda listo para cuando registremos las credenciales OAuth reales.`
    };
  }, []);

  const loginStudentWithPassword = useCallback(async (email: string, password: string) => {
    try {
      const nextBootstrap = await fetchJson<AppBootstrap>("/api/auth/student-login", {
        method: "POST",
        body: JSON.stringify({
          mode: "password",
          email,
          password
        })
      });

      setBootstrap(nextBootstrap);
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : "No se pudo iniciar sesion."
      };
    }
  }, []);

  const loginStudentWithMissionCode = useCallback(async (missionCode: string, email: string) => {
    try {
      const nextBootstrap = await fetchJson<AppBootstrap>("/api/auth/student-login", {
        method: "POST",
        body: JSON.stringify({
          mode: "mission_code",
          email,
          missionCode
        })
      });

      setBootstrap(nextBootstrap);
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : "No se pudo entrar con ese codigo."
      };
    }
  }, []);

  const logout = useCallback(async () => {
    await fetchJson("/api/auth/logout", {
      method: "POST",
      body: JSON.stringify({})
    });
    setBootstrap(emptyBootstrap);
  }, []);

  const addStudent = useCallback(async (input: StudentInput) => {
    const nextBootstrap = await fetchJson<AppBootstrap>("/api/students", {
      method: "POST",
      body: JSON.stringify(input)
    });
    setBootstrap(nextBootstrap);
  }, []);

  const updateStudent = useCallback(async (studentId: string, input: StudentInput) => {
    const nextBootstrap = await fetchJson<AppBootstrap>(`/api/students/${studentId}`, {
      method: "PATCH",
      body: JSON.stringify(input)
    });
    setBootstrap(nextBootstrap);
  }, []);

  const deleteStudent = useCallback(async (studentId: string) => {
    const nextBootstrap = await fetchJson<AppBootstrap>(`/api/students/${studentId}`, {
      method: "DELETE"
    });
    setBootstrap(nextBootstrap);
  }, []);

  const importStudents = useCallback(async (studentsToImport: ImportedStudent[]) => {
    const result = await fetchJson<{ added: number; skipped: string[]; bootstrap: AppBootstrap }>("/api/students/import", {
      method: "POST",
      body: JSON.stringify({ students: studentsToImport })
    });
    setBootstrap(result.bootstrap);
    return {
      added: result.added,
      skipped: result.skipped
    };
  }, []);

  const assignMission = useCallback(async (input: AssignMissionInput) => {
    const result = await fetchJson<{ assignment: Assignment; bootstrap: AppBootstrap }>("/api/assignments", {
      method: "POST",
      body: JSON.stringify(input)
    });
    setBootstrap(result.bootstrap);
    return result.assignment;
  }, []);

  const archiveAssignment = useCallback(async (assignmentId: string) => {
    const nextBootstrap = await fetchJson<AppBootstrap>(`/api/assignments/${assignmentId}/archive`, {
      method: "POST"
    });
    setBootstrap(nextBootstrap);
  }, []);

  const deleteAssignment = useCallback(async (assignmentId: string) => {
    const nextBootstrap = await fetchJson<AppBootstrap>(`/api/assignments/${assignmentId}`, {
      method: "DELETE"
    });
    setBootstrap(nextBootstrap);
  }, []);

  const saveStudentWork = useCallback(async (input: SaveStudentWorkInput) => {
    const nextBootstrap = await fetchJson<AppBootstrap>("/api/student-work/save", {
      method: "POST",
      body: JSON.stringify(input)
    });
    setBootstrap(nextBootstrap);
  }, []);

  const submitStudentWork = useCallback(async (input: SubmitStudentWorkInput) => {
    const nextBootstrap = await fetchJson<AppBootstrap>("/api/student-work/submit", {
      method: "POST",
      body: JSON.stringify(input)
    });
    setBootstrap(nextBootstrap);
  }, []);

  const updateProfile = useCallback(async (input: ProfileInput) => {
    const nextBootstrap = await fetchJson<AppBootstrap>("/api/profile", {
      method: "PATCH",
      body: JSON.stringify(input)
    });
    setBootstrap(nextBootstrap);
  }, []);

  const createClassSession = useCallback(async (input: CreateClassSessionInput) => {
    const result = await fetchJson<{ bootstrap: AppBootstrap; classSession: ClassSession }>("/api/class-sessions", {
      method: "POST",
      body: JSON.stringify(input)
    });
    setBootstrap(result.bootstrap);
    return result.classSession;
  }, []);

  const approveClassSession = useCallback(async (classSessionId: string) => {
    const result = await fetchJson<{ bootstrap: AppBootstrap; classSession: ClassSession }>(
      `/api/class-sessions/${classSessionId}/approve`,
      {
        method: "POST"
      }
    );
    setBootstrap(result.bootstrap);
    return result.classSession;
  }, []);

  const confirmPairingRequest = useCallback(
    async (pairingRequestId: string, input: { assignedName: string; classroomName: string; courseId: string }) => {
      const result = await fetchJson<{ bootstrap: AppBootstrap }>(`/api/pairing-requests/${pairingRequestId}/confirm`, {
        method: "POST",
        body: JSON.stringify(input)
      });
      setBootstrap(result.bootstrap);
    },
    []
  );

  const resetDemoData = useCallback(async () => {
    await refreshData();
  }, [refreshData]);

  const value = useMemo<DemoStore>(
    () => ({
      isReady,
      institution: bootstrap.institution,
      courses: bootstrap.courses,
      missions: bootstrap.missions,
      students: bootstrap.students,
      assignments: bootstrap.assignments,
      studentWorks: bootstrap.studentWorks,
      profile: bootstrap.profile,
      session: bootstrap.session,
      robots: bootstrap.robots,
      classSessions: bootstrap.classSessions,
      pairingRequests: bootstrap.pairingRequests,
      loginWithPassword,
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
      createClassSession,
      approveClassSession,
      confirmPairingRequest,
      resetDemoData,
      refreshData
    }),
    [
      addStudent,
      approveClassSession,
      archiveAssignment,
      assignMission,
      bootstrap,
      confirmPairingRequest,
      createClassSession,
      deleteAssignment,
      deleteStudent,
      importStudents,
      isReady,
      loginStudentWithMissionCode,
      loginStudentWithPassword,
      loginWithPassword,
      loginWithProvider,
      logout,
      refreshData,
      resetDemoData,
      saveStudentWork,
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
