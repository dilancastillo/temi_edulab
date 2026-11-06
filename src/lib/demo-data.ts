import { askAndDecide, buildMission, say } from "@/lib/mission-builder";
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

// ── Misiones base ───────────────────────────────────────────────────────────────
// Pensadas para niños: cada una cuenta una pequeña historia, enseña un concepto nuevo
// y va de lo más fácil a lo más retador. De cada programa salen la solución en bloques
// y los pasos que ve el estudiante (ver mission-builder.ts). El docente puede editarlas:
// se guarda una copia suya y puede volver al original (ver base-missions.ts).

const helloTemi = buildMission("base-hola", [
  { type: "temi_start", label: "¡Enciende a Temi!", helper: "Arrastra el bloque «cuando inicia». Con él empieza todo programa." },
  say("¡Hola! Soy Temi, el nuevo robot del salón.", "Saluda a todos", "Pon un bloque «decir» y escribe cómo se presenta Temi."),
  { type: "temi_show_image", label: "Muestra tu foto", helper: "Usa «mostrar imagen» y carga un dibujo o una foto para que Temi la enseñe en su pantalla." },
  { type: "temi_audio", label: "¡Aplausos!", helper: "Agrega «reproducir audio» y elige Aplausos para celebrar la llegada de Temi.", fields: { AUDIO: "clap" } },
  say("¿Quieres ser mi amigo? ¡Vamos a aprender juntos!", "Haz una invitación", "Termina con otro «decir» invitando a la clase a jugar."),
]);

const classroomGuide = buildMission("base-guia", [
  { type: "temi_start", label: "¡Comienza el recorrido!", helper: "Pon el bloque «cuando inicia» para arrancar la visita." },
  { type: "temi_move", label: "Primera parada", helper: "Con «ir a» lleva a Temi al primer lugar del salón." },
  say("Este es el tablero, aquí aprendemos cosas nuevas cada día.", "Explica el lugar", "Con «decir», Temi cuenta qué hay en este lugar."),
  { type: "temi_show_image", label: "Enseña una foto", helper: "Muestra una imagen de ese lugar para que la visita lo conozca mejor." },
  { type: "temi_move", label: "Segunda parada", helper: "Lleva a Temi a otro lugar con un nuevo «ir a»." },
  say("Aquí está la biblioteca del salón, ¡tiene cuentos increíbles!", "Cuenta un secreto", "Haz que Temi diga algo divertido de este lugar."),
  { type: "temi_show_video", label: "Video sorpresa", helper: "Carga un video corto para mostrarle a la visita." },
  { type: "temi_move", label: "Última parada", helper: "Lleva a Temi al último lugar del recorrido." },
  askAndDecide(
    "¿Te gustó el recorrido?",
    [["sí", "¡Qué bien! Vuelve pronto a visitarnos."], ["no", "Gracias por decirme, la próxima vez lo haré mejor."]],
    "Pregunta a la visita",
    "Usa «si pregunta»: Temi pregunta si le gustó el recorrido y responde distinto según lo que le digan."
  ),
]);

const robotParty = buildMission("base-fiesta", [
  { type: "temi_start", label: "¡Que empiece la fiesta!", helper: "Pon «cuando inicia» para arrancar." },
  say("¡Es hora de bailar! Miren mis pasos.", "Anuncia el baile", "Con «decir», Temi invita a todos a ver su baile."),
  {
    type: "temi_repeat",
    label: "Repite el paso de baile",
    helper: "En vez de poner los mismos bloques muchas veces, usa «repetir» y pon el número 3.",
    fields: { TIMES: 3 },
    children: [
      { type: "temi_move", label: "Ve a un lado", helper: "Dentro de «repetir», lleva a Temi a un lugar." },
      { type: "temi_move", label: "Vuelve al otro lado", helper: "Todavía dentro, llévalo a otro lugar para que vaya y vuelva." },
      { type: "temi_audio", label: "¡Suena la campana!", helper: "Agrega una campana al final de cada vuelta.", fields: { AUDIO: "bell" } },
    ],
  },
  { type: "temi_audio", label: "Gran final", helper: "Ya fuera de «repetir», pon aplausos para terminar.", fields: { AUDIO: "clap" } },
  say("¡Gracias, gracias! Fue la mejor fiesta.", "Despídete", "Temi se despide de su público."),
]);

const cafeteria = buildMission("base-cafeteria", [
  { type: "temi_start", label: "Abre la cafetería", helper: "Pon «cuando inicia» para empezar el turno de Temi." },
  say("¡Bienvenido a la cafetería de Temi!", "Recibe al cliente", "Con «decir», Temi saluda a quien llega."),
  askAndDecide(
    "¿Qué quieres comer hoy, fruta o galletas?",
    [["fruta", "¡Muy saludable! Aquí tienes tu fruta."], ["galletas", "¡Qué rico! Aquí tienes tus galletas."]],
    "Pregunta qué quiere",
    "Usa «si pregunta» con dos opciones: fruta y galletas. Escribe qué responde Temi en cada caso."
  ),
  { type: "temi_move", label: "Lleva el pedido", helper: "Con «ir a» lleva a Temi a la mesa del cliente." },
  say("¡Buen provecho! Que disfrutes tu comida.", "Entrega el pedido", "Temi entrega el pedido con un mensaje amable."),
]);

const simonSays = buildMission("base-simon", [
  { type: "temi_start", label: "¡A jugar!", helper: "Pon «cuando inicia» para empezar el juego." },
  say("Vamos a jugar Simón dice. Cuando quieras parar, di: listo.", "Explica las reglas", "Con «decir», Temi cuenta cómo se juega y cuál es la palabra para parar."),
  {
    type: "temi_while_listen",
    label: "Juega hasta escuchar «listo»",
    helper: "Usa «repetir hasta escuchar» y escribe la palabra listo. Temi seguirá jugando hasta oírla.",
    fields: { STOP_WORD: "listo" },
    children: [
      say("Simón dice: ¡salta tres veces!", "Da una orden", "Dentro del bloque, Temi da una orden divertida."),
      { type: "temi_wait", label: "Espera a que lo hagan", helper: "Con «esperar», da 5 segundos para que todos cumplan la orden.", fields: { MINUTES: 5 } },
      { type: "temi_audio", label: "¡Muy bien!", helper: "Una campana avisa que la orden terminó.", fields: { AUDIO: "bell" } },
    ],
  },
  say("¡Ganaste! Eres un gran jugador.", "Celebra el final", "Ya fuera del bloque, Temi felicita al jugador."),
]);

const healthAssistant = buildMission("base-salud", [
  { type: "temi_start", label: "Temi empieza su turno", helper: "Pon «cuando inicia» para que Temi entre a trabajar en la clínica." },
  {
    type: "temi_while_mqtt",
    label: "Ronda hasta la alerta",
    helper: "Usa «repetir hasta que el mensaje del sensor sea» y escribe temp/alta. Temi hará su ronda hasta que el termómetro avise.",
    fields: { TOPIC: "temp/alta" },
    children: [
      { type: "temi_move", label: "Visita la sala de espera", helper: "Dentro del bloque, lleva a Temi a la sala de espera." },
      say("Recuerden lavarse las manos y tomar agua.", "Da un consejo de salud", "Temi da un consejo para cuidarse."),
      { type: "temi_wait", label: "Descansa un momento", helper: "Con «esperar», Temi se queda 5 segundos antes de seguir su ronda.", fields: { MINUTES: 5 } },
    ],
  },
  { type: "temi_move", label: "Corre donde la enfermera", helper: "¡Llegó la alerta! Fuera del bloque, lleva a Temi donde la enfermera." },
  say("¡Atención! Un paciente tiene la temperatura alta.", "Avisa a la enfermera", "Temi le cuenta a la enfermera lo que pasó."),
  { type: "temi_move", label: "Acompaña al paciente", helper: "Ahora lleva a Temi a la camilla del paciente." },
  say("Tranquilo, la enfermera ya viene en camino.", "Tranquiliza al paciente", "Temi acompaña al paciente con palabras amables."),
]);

const museumGuard = buildMission("base-museo", [
  { type: "temi_start", label: "Abre el museo", helper: "Pon «cuando inicia» para empezar la visita." },
  {
    type: "temi_while_timer",
    label: "Atiende durante 2 minutos",
    helper: "Usa «repetir mientras tiempo» con 2 minutos: Temi atenderá visitantes mientras dure ese tiempo.",
    fields: { SECONDS: 2 },
    children: [
      { type: "temi_move", label: "Ve a una obra", helper: "Dentro del bloque, lleva a Temi frente a una obra del museo." },
      askAndDecide(
        "¿Quieres saber un dato curioso de esta obra?",
        [["sí", "Esta obra la pintó un niño de tu edad hace muchos años."], ["no", "Está bien, sigamos con el recorrido."]],
        "Pregunta al visitante",
        "Dentro del mismo bloque, usa «si pregunta» para que Temi decida qué decir según la respuesta."
      ),
      { type: "temi_wait", label: "Dale tiempo para mirar", helper: "Con «esperar», deja 5 segundos para observar la obra.", fields: { MINUTES: 5 } },
    ],
  },
  say("El museo va a cerrar. ¡Gracias por tu visita!", "Cierra el museo", "Fuera del bloque, Temi se despide cuando se acaba el tiempo."),
]);

export const demoMissions: Mission[] = [
  {
    id: "mission-foundations",
    title: "¡Hola, soy Temi!",
    summary: "Temi acaba de llegar al salón y está un poco nervioso. Ayúdalo a presentarse: que salude, muestre su foto, reciba aplausos e invite a todos a ser sus amigos. Es tu primer programa con bloques.",
    category: "Fundamentos",
    ageBand: "7-10",
    durationMinutes: 20,
    outcomes: ["Mi primer programa", "Secuencias", "Comunicación"],
    status: "published",
    coverTone: "indigo",
    allowedCategories: ["Movimiento", "Hablar", "Mostrar", "Audio"],
    ...helloTemi,
  },
  {
    id: "mission-order-steps",
    title: "Taller Guía mi salón",
    summary: "¡Llegó una visita especial al colegio! Temi será el guía del salón: llévalo a tres lugares importantes, haz que explique qué hay en cada uno, muestre fotos y un video, y al final pregúntale a la visita si le gustó el recorrido.",
    category: "Fundamentos",
    ageBand: "9-10",
    durationMinutes: 45,
    outcomes: ["Secuencias", "Ubicación en el espacio", "Comunicación creativa"],
    status: "published",
    coverTone: "blue",
    allowedCategories: ["Movimiento", "Hablar", "Mostrar", "Condición"],
    ...classroomGuide,
  },
  {
    id: "mission-loops",
    title: "La fiesta de Temi",
    summary: "¡Temi quiere bailar! Su paso de baile es ir a un lado, volver al otro y sonar una campana. Usa el bloque «repetir» para que lo haga tres veces sin tener que poner los mismos bloques una y otra vez.",
    category: "Logica",
    ageBand: "7-10",
    durationMinutes: 30,
    outcomes: ["Bucles", "Patrones", "Programar menos, lograr más"],
    status: "published",
    coverTone: "yellow",
    allowedCategories: ["Movimiento", "Hablar", "Audio", "Control"],
    ...robotParty,
  },
  {
    id: "mission-decisions",
    title: "Temi, el mesero",
    summary: "Temi atiende la cafetería del colegio. Debe saludar, preguntar si quieren fruta o galletas y responder distinto según lo que le pidan. Luego lleva el pedido a la mesa. ¡Aprende a que tu robot tome decisiones!",
    category: "Logica",
    ageBand: "9-10",
    durationMinutes: 30,
    outcomes: ["Condicionales", "Tomar decisiones", "Escuchar al usuario"],
    status: "published",
    coverTone: "green",
    allowedCategories: ["Movimiento", "Hablar", "Condición"],
    ...cafeteria,
  },
  {
    id: "mission-events",
    title: "Simón dice con Temi",
    summary: "Juega Simón dice con Temi: él da órdenes divertidas, espera a que las cumplan y suena una campana. El juego sigue hasta que alguien diga «listo». Aprende cómo un robot reacciona a lo que escucha.",
    category: "Control",
    ageBand: "7-10",
    durationMinutes: 25,
    outcomes: ["Eventos", "Bucles con condición", "Interacción"],
    status: "published",
    coverTone: "red",
    allowedCategories: ["Hablar", "Audio", "Control"],
    ...simonSays,
  },
  {
    id: "mission-nurse-alert",
    title: "Temi, asistente de salud",
    summary: "Temi ayuda en la clínica: hace su ronda dando consejos de salud hasta que el termómetro inteligente le avisa que un paciente tiene fiebre. Entonces corre a avisarle a la enfermera y acompaña al paciente.",
    category: "Control",
    ageBand: "11-14",
    durationMinutes: 45,
    outcomes: ["Bucles", "Sensores", "Responder a una alerta"],
    status: "published",
    coverTone: "slate",
    allowedCategories: ["Movimiento", "Hablar", "Control"],
    ...healthAssistant,
  },
  {
    id: "mission-nested-logic",
    title: "El guardián del museo",
    summary: "Durante dos minutos, Temi recorre el museo: va frente a una obra, pregunta si quieren saber un dato curioso y responde según lo que le digan. ¡Un reto con una decisión dentro de una repetición!",
    category: "Robotica",
    ageBand: "11-14",
    durationMinutes: 40,
    outcomes: ["Lógica anidada", "Bucles por tiempo", "Planeación"],
    status: "published",
    coverTone: "red",
    allowedCategories: ["Movimiento", "Hablar", "Condición", "Control"],
    ...museumGuard,
  },
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
