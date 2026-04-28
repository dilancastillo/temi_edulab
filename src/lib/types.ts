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
  workshop?: WorkshopSession;
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

export type Robot = {
  id: string;
  institutionId: string;
  courseId?: string;
  displayName: string;
  classroomName?: string;
  pairCode?: string;
  connectionState: string;
  batteryPercent?: number;
  statusLabel?: string;
  lastSeenAt?: string;
};

export type RobotLocation = {
  id: string;
  robotId: string;
  name: string;
  available: boolean;
  detail?: string;
  lastValidatedAt: string;
};

export type PairingRequest = {
  id: string;
  robotId?: string;
  institutionId?: string;
  code: string;
  proposedName: string;
  classroomName?: string;
  sessionUri?: string;
  status: "pending" | "confirmed" | "consumed" | "expired";
  expiresAt: string;
  confirmedAt?: string;
  consumedAt?: string;
};

export type WorkshopParticipationMode = "individual" | "teams";

export type WorkshopDeviceMode = "student_device" | "team_device" | "teacher_demo";

export type WorkshopExecutionMode = "normal" | "demo_safe";
export type WorkshopStudentMode = "guided" | "advanced";

export type WorkshopMessageMode = "template" | "custom";

export type WorkshopIconKey = "board" | "books" | "star" | "paint" | "microscope" | "trophy";

export type WorkshopCheckpoint = {
  locationName: string;
  alias: string;
  iconKey: WorkshopIconKey;
  messageMode: WorkshopMessageMode;
  messageText: string;
};

export type WorkshopChecklist = {
  robotConnected: boolean;
  batteryReady: boolean;
  mapReady: boolean;
  checkpointsReady: boolean;
  baseReady: boolean;
  routeSafeConfirmed: boolean;
  executionModeConfirmed: boolean;
};

export type WorkshopSession = {
  missionType: "classroom_guide";
  workshopName: string;
  studentMode: WorkshopStudentMode;
  participationMode: WorkshopParticipationMode;
  deviceMode: WorkshopDeviceMode;
  executionMode: WorkshopExecutionMode;
  turnDurationMinutes: number;
  baseLocationName: string;
  checkpoints: WorkshopCheckpoint[];
  checklist: WorkshopChecklist;
};

export type ClassSession = {
  id: string;
  institutionId: string;
  robotId: string;
  courseId: string;
  assignmentId: string;
  classroomName: string;
  missionTitle: string;
  activeStudentName?: string;
  status: string;
  currentStepLabel?: string;
  progressPercent: number;
  workshop?: WorkshopSession;
  approvedAt?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type AppBootstrap = {
  session: Session | null;
  institution: Institution;
  courses: Course[];
  missions: Mission[];
  students: Student[];
  assignments: Assignment[];
  studentWorks: StudentWork[];
  profile: TeacherProfile;
  robots: Robot[];
  classSessions: ClassSession[];
  pairingRequests: PairingRequest[];
};
