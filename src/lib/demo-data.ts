import type { Assignment, Course, Institution, Mission, Student, StudentWork, TeacherProfile } from "@/lib/types";

export const demoInstitution: Institution = {
  id: "inst-esbot",
  name: "Colegio Esbot EduLab",
  slug: "esbot-edulab"
};

export const demoCourses: Course[] = [
  { id: "course-10a", institutionId: demoInstitution.id, name: "10 A", level: "10" },
  { id: "course-10b", institutionId: demoInstitution.id, name: "10 B", level: "10" },
  { id: "course-11a", institutionId: demoInstitution.id, name: "11 A", level: "11" },
  { id: "course-robotica", institutionId: demoInstitution.id, name: "Club Robótica", level: "Extracurricular" }
];

export const demoTeacherProfile: TeacherProfile = {
  id: "teacher-demo",
  institutionId: demoInstitution.id,
  fullName: "Elena Martinez",
  email: "profesor@esbot.test",
  biography:
    "Docente enfocada en aprendizaje STEAM, pensamiento computacional y experiencias seguras con robótica educativa."
};

export const demoMissions: Mission[] = [
  {
    id: "mission-order-steps",
    title: "Ordena los pasos",
    summary: "Organiza instrucciones paso a paso para que el robot llegue correctamente a la meta.",
    category: "Fundamentos",
    ageBand: "7-10",
    durationMinutes: 20,
    outcomes: ["Secuenciación", "Resolución de problemas"],
    status: "published",
    coverTone: "blue"
  },
  {
    id: "mission-foundations",
    title: "Fundamentos",
    summary: "Crea tus primeras acciones y entiende como funcionan los bloques interactivos.",
    category: "Fundamentos",
    ageBand: "11-14",
    durationMinutes: 25,
    outcomes: ["Bloques básicos", "Pensamiento computacional"],
    status: "published",
    coverTone: "indigo"
  },
  {
    id: "mission-decisions",
    title: "Toma decisiones",
    summary: "Usa condiciones para que el personaje actue segun lo que ocurra en el juego.",
    category: "Logica",
    ageBand: "7-10",
    durationMinutes: 30,
    outcomes: ["Condicionales", "Razonamiento lógico"],
    status: "published",
    coverTone: "green"
  },
  {
    id: "mission-loops",
    title: "Repeticiones",
    summary: "Resuelve retos mas rapido usando bloques que ejecutan movimientos varias veces.",
    category: "Logica",
    ageBand: "11-14",
    durationMinutes: 30,
    outcomes: ["Bucles", "Patrones"],
    status: "published",
    coverTone: "yellow"
  },
  {
    id: "mission-events",
    title: "Acciones y eventos",
    summary: "Aprende a crear acciones que ocurren al interactuar, presionar botones o tocar objetos.",
    category: "Control",
    ageBand: "7-10",
    durationMinutes: 25,
    outcomes: ["Eventos", "Interaccion"],
    status: "published",
    coverTone: "slate"
  },
  {
    id: "mission-nested-logic",
    title: "Lógica anidada",
    summary: "Combina diferentes bloques y decisiones para resolver retos más inteligentes.",
    category: "Robotica",
    ageBand: "15-18",
    durationMinutes: 35,
    outcomes: ["Lógica compuesta", "Planeación"],
    status: "published",
    coverTone: "red"
  }
];

export const demoStudents: Student[] = [
  {
    id: "student-ana",
    institutionId: demoInstitution.id,
    courseId: "course-10a",
    fullName: "Ana Garcia",
    email: "ana.garcia@esbot.test",
    progress: "En curso",
    createdAt: "2026-04-01T13:00:00.000Z"
  },
  {
    id: "student-camilo",
    institutionId: demoInstitution.id,
    courseId: "course-10a",
    fullName: "Camilo Lopez",
    email: "camilo.lopez@esbot.test",
    progress: "En curso",
    createdAt: "2026-04-01T13:10:00.000Z"
  },
  {
    id: "student-andres",
    institutionId: demoInstitution.id,
    courseId: "course-10a",
    fullName: "Andres Lara",
    email: "andres.lara@esbot.test",
    progress: "En curso",
    createdAt: "2026-04-01T13:20:00.000Z"
  },
  {
    id: "student-mateo",
    institutionId: demoInstitution.id,
    courseId: "course-10a",
    fullName: "Mateo Salazar",
    email: "mateo.salazar@esbot.test",
    progress: "En curso",
    createdAt: "2026-04-01T13:30:00.000Z"
  },
  {
    id: "student-laura",
    institutionId: demoInstitution.id,
    courseId: "course-10b",
    fullName: "Laura Mendez",
    email: "laura.mendez@esbot.test",
    progress: "En curso",
    createdAt: "2026-04-02T13:00:00.000Z"
  },
  {
    id: "student-sofia",
    institutionId: demoInstitution.id,
    courseId: "course-10b",
    fullName: "Sofia Rojas",
    email: "sofia.rojas@esbot.test",
    progress: "En curso",
    createdAt: "2026-04-02T13:20:00.000Z"
  },
  {
    id: "student-valentina",
    institutionId: demoInstitution.id,
    courseId: "course-11a",
    fullName: "Valentina Ruiz",
    email: "valentina.ruiz@esbot.test",
    progress: "En curso",
    createdAt: "2026-04-03T13:20:00.000Z"
  },
  {
    id: "student-daniel",
    institutionId: demoInstitution.id,
    courseId: "course-robotica",
    fullName: "Daniel Torres",
    email: "daniel.torres@esbot.test",
    progress: "En curso",
    createdAt: "2026-04-03T13:30:00.000Z"
  }
];

export const demoAssignments: Assignment[] = [];

export const demoStudentWorks: StudentWork[] = [];
