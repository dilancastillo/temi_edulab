export type UserRole = "teacher" | "student" | "institution_admin" | "admin";

export type AuthProvider = "password" | "google" | "microsoft" | "mission_code";

export type Institution = {
  id: string;
  name: string;
  slug: string;
};

export type Course = {
  id: string;
  institutionId: string;
  name: string;
  level: string;
};

export type TeacherProfile = {
  id: string;
  institutionId: string;
  fullName: string;
  email: string;
  biography: string;
  avatarUrl?: string;
};

export type Session = {
  userId: string;
  institutionId: string;
  role: UserRole;
  provider: AuthProvider;
  displayName: string;
  email: string;
  studentId?: string;
};

export type StudentProgress = "En curso" | "Revisar" | "Calificado";

export type Student = {
  id: string;
  institutionId: string;
  courseId: string;
  fullName: string;
  email: string;
  progress: StudentProgress;
  currentMissionId?: string;
  avatarUrl?: string;
  createdAt: string;
};

export type MissionCategory = "Fundamentos" | "Logica" | "Control" | "Robotica";

export type MissionAgeBand = "7-10" | "11-14" | "15-18";

export type Mission = {
  id: string;
  title: string;
  summary: string;
  category: MissionCategory;
  ageBand: MissionAgeBand;
  durationMinutes: number;
  outcomes: string[];
  status: "published" | "draft";
  coverTone: "blue" | "green" | "yellow" | "red" | "indigo" | "slate";
};

export type AssignmentStatus = "active" | "archived";

export type Assignment = {
  id: string;
  institutionId: string;
  courseId: string;
  missionId: string;
  missionCode: string;
  instructions?: string;
  status: AssignmentStatus;
  assignedAt: string;
  assignedBy: string;
  completedCount: number;
  reviewCount: number;
};

export type StudentWorkStatus = "draft" | "submitted";

export type StudentWork = {
  id: string;
  institutionId: string;
  studentId: string;
  assignmentId: string;
  missionId: string;
  workspaceState?: unknown;
  stepIndex: number;
  status: StudentWorkStatus;
  updatedAt: string;
  submittedAt?: string;
};

export type StudentInput = {
  fullName: string;
  email: string;
  courseId: string;
  avatarUrl?: string;
};

export type ProfileInput = {
  fullName: string;
  email: string;
  biography: string;
  avatarUrl?: string;
};

export type ImportedStudent = {
  fullName: string;
  email: string;
  courseName: string;
};

export type ImportResult = {
  students: ImportedStudent[];
  errors: string[];
};

export type StudentLoginResult = {
  ok: boolean;
  message?: string;
};
