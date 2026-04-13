export const demoInstitution = {
  id: "inst-esbot",
  name: "Colegio Esbot EduLab",
  slug: "esbot-edulab"
};

export const demoCourses = [
  { id: "course-10a", institutionId: demoInstitution.id, name: "10 A", level: "10" },
  { id: "course-10b", institutionId: demoInstitution.id, name: "10 B", level: "10" },
  { id: "course-11a", institutionId: demoInstitution.id, name: "11 A", level: "11" },
  { id: "course-robotica", institutionId: demoInstitution.id, name: "Club Robotica", level: "Extracurricular" }
] as const;

export const demoUsers = {
  teacher: {
    id: "teacher-demo",
    institutionId: demoInstitution.id,
    role: "TEACHER",
    fullName: "Elena Martinez",
    email: "profesor@esbot.test",
    biography:
      "Docente enfocada en aprendizaje STEAM, pensamiento computacional y experiencias seguras con robotica educativa."
  },
  institutionAdmin: {
    id: "institution-admin-demo",
    institutionId: demoInstitution.id,
    role: "INSTITUTION_ADMIN",
    fullName: "Mariana Torres",
    email: "admin@esbot.test",
    biography: "Coordinadora institucional encargada del despliegue de aulas roboticas y permisos operativos."
  },
  students: [
    {
      id: "student-ana",
      institutionId: demoInstitution.id,
      courseId: "course-10a",
      fullName: "Ana Garcia",
      email: "ana.garcia@esbot.test",
      progress: "IN_PROGRESS",
      currentMissionId: "mission-order-steps",
      createdAt: "2026-04-01T13:00:00.000Z"
    },
    {
      id: "student-camilo",
      institutionId: demoInstitution.id,
      courseId: "course-10a",
      fullName: "Camilo Lopez",
      email: "camilo.lopez@esbot.test",
      progress: "IN_PROGRESS",
      currentMissionId: "mission-order-steps",
      createdAt: "2026-04-01T13:10:00.000Z"
    },
    {
      id: "student-andres",
      institutionId: demoInstitution.id,
      courseId: "course-10a",
      fullName: "Andres Lara",
      email: "andres.lara@esbot.test",
      progress: "NEEDS_REVIEW",
      currentMissionId: "mission-order-steps",
      createdAt: "2026-04-01T13:20:00.000Z"
    },
    {
      id: "student-mateo",
      institutionId: demoInstitution.id,
      courseId: "course-10a",
      fullName: "Mateo Salazar",
      email: "mateo.salazar@esbot.test",
      progress: "IN_PROGRESS",
      currentMissionId: "mission-order-steps",
      createdAt: "2026-04-01T13:30:00.000Z"
    },
    {
      id: "student-laura",
      institutionId: demoInstitution.id,
      courseId: "course-10b",
      fullName: "Laura Mendez",
      email: "laura.mendez@esbot.test",
      progress: "GRADED",
      currentMissionId: "mission-events",
      createdAt: "2026-04-02T13:00:00.000Z"
    },
    {
      id: "student-sofia",
      institutionId: demoInstitution.id,
      courseId: "course-10b",
      fullName: "Sofia Rojas",
      email: "sofia.rojas@esbot.test",
      progress: "NEEDS_REVIEW",
      currentMissionId: "mission-decisions",
      createdAt: "2026-04-02T13:20:00.000Z"
    },
    {
      id: "student-valentina",
      institutionId: demoInstitution.id,
      courseId: "course-11a",
      fullName: "Valentina Ruiz",
      email: "valentina.ruiz@esbot.test",
      progress: "IN_PROGRESS",
      currentMissionId: "mission-loops",
      createdAt: "2026-04-03T13:20:00.000Z"
    },
    {
      id: "student-daniel",
      institutionId: demoInstitution.id,
      courseId: "course-robotica",
      fullName: "Daniel Torres",
      email: "daniel.torres@esbot.test",
      progress: "GRADED",
      currentMissionId: "mission-nested-logic",
      createdAt: "2026-04-03T13:30:00.000Z"
    }
  ]
} as const;

export const demoMissions = [
  {
    id: "mission-order-steps",
    title: "Ordena los pasos",
    summary: "Organiza instrucciones paso a paso para que el robot llegue correctamente a la meta.",
    category: "FUNDAMENTALS",
    ageBand: "AGE_7_10",
    durationMinutes: 20,
    outcomes: ["Secuenciacion", "Resolucion de problemas"],
    status: "PUBLISHED",
    coverTone: "BLUE"
  },
  {
    id: "mission-foundations",
    title: "Fundamentos",
    summary: "Crea tus primeras acciones y entiende como funcionan los bloques interactivos.",
    category: "FUNDAMENTALS",
    ageBand: "AGE_11_14",
    durationMinutes: 25,
    outcomes: ["Bloques basicos", "Pensamiento computacional"],
    status: "PUBLISHED",
    coverTone: "INDIGO"
  },
  {
    id: "mission-decisions",
    title: "Toma decisiones",
    summary: "Usa condiciones para que el personaje actue segun lo que ocurra en el juego.",
    category: "LOGIC",
    ageBand: "AGE_7_10",
    durationMinutes: 30,
    outcomes: ["Condicionales", "Razonamiento logico"],
    status: "PUBLISHED",
    coverTone: "GREEN"
  },
  {
    id: "mission-loops",
    title: "Repeticiones",
    summary: "Resuelve retos mas rapido usando bloques que ejecutan movimientos varias veces.",
    category: "LOGIC",
    ageBand: "AGE_11_14",
    durationMinutes: 30,
    outcomes: ["Bucles", "Patrones"],
    status: "PUBLISHED",
    coverTone: "YELLOW"
  },
  {
    id: "mission-events",
    title: "Acciones y eventos",
    summary: "Aprende a crear acciones que ocurren al interactuar, presionar botones o tocar objetos.",
    category: "CONTROL",
    ageBand: "AGE_7_10",
    durationMinutes: 25,
    outcomes: ["Eventos", "Interaccion"],
    status: "PUBLISHED",
    coverTone: "SLATE"
  },
  {
    id: "mission-nested-logic",
    title: "Logica anidada",
    summary: "Combina diferentes bloques y decisiones para resolver retos mas inteligentes.",
    category: "ROBOTICS",
    ageBand: "AGE_15_18",
    durationMinutes: 35,
    outcomes: ["Logica compuesta", "Planeacion"],
    status: "PUBLISHED",
    coverTone: "RED"
  }
] as const;

export const demoAssignments = [
  {
    id: "assignment-order-steps-10a",
    institutionId: demoInstitution.id,
    courseId: "course-10a",
    missionId: "mission-order-steps",
    missionCode: "SGKRBY",
    status: "ACTIVE",
    assignedAt: "2026-04-04T14:00:00.000Z",
    assignedById: demoUsers.teacher.id,
    completedCount: 0,
    reviewCount: 1
  },
  {
    id: "assignment-events-10b",
    institutionId: demoInstitution.id,
    courseId: "course-10b",
    missionId: "mission-events",
    missionCode: "PLSJLA",
    status: "ACTIVE",
    assignedAt: "2026-04-05T14:00:00.000Z",
    assignedById: demoUsers.teacher.id,
    completedCount: 1,
    reviewCount: 0
  },
  {
    id: "assignment-loops-11a",
    institutionId: demoInstitution.id,
    courseId: "course-11a",
    missionId: "mission-loops",
    missionCode: "RPQ914",
    status: "ACTIVE",
    assignedAt: "2026-04-05T15:00:00.000Z",
    assignedById: demoUsers.teacher.id,
    completedCount: 0,
    reviewCount: 0
  }
] as const;

export const demoStudentWorks = [
  {
    id: "work-ana-order-steps",
    institutionId: demoInstitution.id,
    studentId: "student-ana",
    assignmentId: "assignment-order-steps-10a",
    missionId: "mission-order-steps",
    stepIndex: 1,
    status: "DRAFT",
    updatedAt: "2026-04-05T16:00:00.000Z"
  },
  {
    id: "work-camilo-order-steps",
    institutionId: demoInstitution.id,
    studentId: "student-camilo",
    assignmentId: "assignment-order-steps-10a",
    missionId: "mission-order-steps",
    stepIndex: 0,
    status: "DRAFT",
    updatedAt: "2026-04-05T16:10:00.000Z"
  },
  {
    id: "work-andres-order-steps",
    institutionId: demoInstitution.id,
    studentId: "student-andres",
    assignmentId: "assignment-order-steps-10a",
    missionId: "mission-order-steps",
    stepIndex: 5,
    status: "SUBMITTED",
    updatedAt: "2026-04-05T16:20:00.000Z",
    submittedAt: "2026-04-05T16:35:00.000Z"
  }
] as const;

export const demoRobot = {
  id: "robot-temi-5a",
  institutionId: demoInstitution.id,
  courseId: "course-10a",
  displayName: "Temi V3 Aula 5A",
  slug: "temi-v3-aula-5a",
  classroomName: "5A Ciencias",
  pairCode: "EDU-5A-2047",
  connectionState: "CONNECTED",
  batteryPercent: 82,
  statusLabel: "Listo",
  lastSeenAt: "2026-04-11T19:00:00.000Z"
} as const;

export const demoRobotLocations = [
  { name: "biblioteca", detail: "Ruta lista", available: true },
  { name: "salon 5a", detail: "Base de clase", available: true },
  { name: "laboratorio", detail: "Punto alterno", available: true }
] as const;
