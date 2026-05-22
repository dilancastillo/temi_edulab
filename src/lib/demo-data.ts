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
  teacherId: "teacher-demo",
  institutionId: demoInstitution.id,
  fullName: "Elena Martinez",
  email: "profesor@esbot.test",
  biography:
    "Docente enfocada en aprendizaje STEAM, pensamiento computacional y experiencias seguras con robótica educativa."
};

export const demoMissions: Mission[] = [
  {
    id: "mission-order-steps",
    title: "Taller Guía mi salón",
    summary: "Hoy Temi será el guía oficial del salón. Llegó una visita especial al colegio y necesita conocer el aula. Tu misión es programar a Temi para que recorra tres lugares importantes del salón y explique qué hay en cada uno.",
    category: "Fundamentos",
    ageBand: "9-10",
    durationMinutes: 60,
    outcomes: ["Resolución de problemas", "Comunicación creativa", "Pensamiento computacional"],
    status: "published",
    coverTone: "blue",
    allowedCategories: ["Movimiento", "Hablar", "Mostrar", "Condición", "Control"],
    steps: [
      {
        type: "temi_start",
        label: "¡Comienza la aventura!",
        helper: "Todo comienza aquí."
      },
      {
        type: "temi_move",
        label: "¡Primer reto!",
        helper: "Lleva a Temi al primer lugar."
      },
      {
        type: "temi_say",
        label: "¡Cuéntame qué ves!",
        helper: "Haz que Temi cuente lo que ve."
      },
      {
        type: "temi_show_image",
        label: "¡Sorpresa en pantalla!",
        helper: "Temi enseña una imagen."
      },
      {
        type: "temi_move",
        label: "¡Sigamos explorando!",
        helper: "Muévete al siguiente lugar."
      },
      {
        type: "temi_say",
        label: "¡Descubrimiento!",
        helper: "Temi cuenta lo que encuentra otra vez."
      },
      {
        type: "temi_show_image",
        label: "¡Otra sorpresa!",
        helper: "Temi enseña otra imagen."
      },
      {
        type: "temi_show_video",
        label: "¡Acción en pantalla!",
        helper: "Temi reproduce un video para el visitante."
      },
      {
        type: "temi_move",
        label: "¡Última parada!",
        helper: "Llévalo al punto final."
      },
      {
        type: "temi_condition",
        label: "¡Pregunta al visitante!",
        helper: "Haz que Temi pregunte y reaccione según la respuesta."
      }
    ]
  },
  {
    id: "mission-nurse-alert",
    title: "Temi Asistente de Salud",
    summary: "Temi es el asistente de salud de la clínica. Mientras no hay emergencias, recorre las zonas educando y tranquilizando a los pacientes. Pero cuando el termómetro inteligente detecta una subida de temperatura, le envía una señal a Temi. Él interrumpe su ronda, va donde la enfermera para reportar el caso y luego se dirige a la camilla del paciente para acompañarlo. Tu misión es programar estas dos rutinas para que Temi reaccione a tiempo ante una emergencia médica.",
    category: "Control",
    ageBand: "11-14",
    durationMinutes: 45,
    outcomes: ["Bucles", "Eventos MQTT", "Secuencias", "Pensamiento computacional"],
    status: "published",
    coverTone: "slate",
    allowedCategories: ["Movimiento", "Hablar", "Mostrar" ,"Control"],
    steps: [
    {
      type: "temi_start",
      label: "¡Temi entra en servicio!",
      helper: "Todo programa necesita un bloque de inicio."
    },
    {
      type: "temi_while_mqtt",
      label: "Ronda de espera",
      helper: "Temi recorre las zonas hasta recibir la señal del termómetro. Escribe el topic 'termometro' y agrega los bloques de movimiento y voz adentro."
    },
    {
      type: "temi_move",
      label: "Ir donde la enfermera",
      helper: "Cuando el termómetro envía la señal, Temi sale del bucle y se dirige a la enfermera."
    },
    {
      type: "temi_say",
      label: "Reportar la alerta",
      helper: "Temi le avisa a la enfermera qué paciente tuvo una subida de temperatura."
    },
    {
      type: "temi_move",
      label: "Ir a la camilla",
      helper: "Después de avisar, Temi se dirige al paciente para acompañarlo."
    },
    {
      type: "temi_say",
      label: "Acompañar al paciente",
      helper: "Temi tranquiliza al paciente mientras llega la enfermera."
    }
  ]
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
  { id: "student-ana", teacherId: "teacher-demo", institutionId: demoInstitution.id, courseId: "course-10a", fullName: "Ana Garcia", email: "ana.garcia@esbot.test", password: "demo2026", progress: "En curso", createdAt: "2026-04-01T13:00:00.000Z" },
  { id: "student-camilo", teacherId: "teacher-demo", institutionId: demoInstitution.id, courseId: "course-10a", fullName: "Camilo Lopez", email: "camilo.lopez@esbot.test", password: "demo2026", progress: "En curso", createdAt: "2026-04-01T13:10:00.000Z" },
  { id: "student-andres", teacherId: "teacher-demo", institutionId: demoInstitution.id, courseId: "course-10a", fullName: "Andres Lara", email: "andres.lara@esbot.test", password: "demo2026", progress: "En curso", createdAt: "2026-04-01T13:20:00.000Z" },
  { id: "student-mateo", teacherId: "teacher-demo", institutionId: demoInstitution.id, courseId: "course-10a", fullName: "Mateo Salazar", email: "mateo.salazar@esbot.test", password: "demo2026", progress: "En curso", createdAt: "2026-04-01T13:30:00.000Z" },
  { id: "student-laura", teacherId: "teacher-demo", institutionId: demoInstitution.id, courseId: "course-10b", fullName: "Laura Mendez", email: "laura.mendez@esbot.test", password: "demo2026", progress: "En curso", createdAt: "2026-04-02T13:00:00.000Z" },
  { id: "student-sofia", teacherId: "teacher-demo", institutionId: demoInstitution.id, courseId: "course-10b", fullName: "Sofia Rojas", email: "sofia.rojas@esbot.test", password: "demo2026", progress: "En curso", createdAt: "2026-04-02T13:20:00.000Z" },
  { id: "student-valentina", teacherId: "teacher-demo", institutionId: demoInstitution.id, courseId: "course-11a", fullName: "Valentina Ruiz", email: "valentina.ruiz@esbot.test", password: "demo2026", progress: "En curso", createdAt: "2026-04-03T13:20:00.000Z" },
  { id: "student-daniel", teacherId: "teacher-demo", institutionId: demoInstitution.id, courseId: "course-robotica", fullName: "Daniel Torres", email: "daniel.torres@esbot.test", password: "demo2026", progress: "En curso", createdAt: "2026-04-03T13:30:00.000Z" },
];

export const demoAssignments: Assignment[] = [];

export const demoStudentWorks: StudentWork[] = [];
