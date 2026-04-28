"use client";

import Link from "next/link";
import type { Dispatch, SetStateAction } from "react";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { useDemoStore } from "@/components/demo-store-provider";
import { classroomGuideMissionId } from "@/lib/mission-constants";
import type {
  RobotLocation,
  WorkshopCheckpoint,
  WorkshopDeviceMode,
  WorkshopExecutionMode,
  WorkshopIconKey,
  WorkshopParticipationMode,
  WorkshopStudentMode
} from "@/lib/types";

type Props = { assignmentId: string };

type WorkshopForm = {
  robotId: string;
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

const durationOptions = [5, 7, 10, 12] as const;
const studentModeOptions = [
  ["guided", "Guiado", "Paso a paso y con una sola tarea principal por pantalla."],
  ["advanced", "Avanzado", "El recorrido completo se construye desde bloques."]
] as const;
const participationOptions = [
  ["individual", "Individual", "Turnos cortos por estudiante."],
  ["teams", "Por equipos", "Un grupo prepara y presenta junto a Temi."]
] as const;
const deviceOptions = [
  ["student_device", "Un dispositivo por estudiante"],
  ["team_device", "Un dispositivo por equipo"],
  ["teacher_demo", "Demostracion guiada"]
] as const;
const executionOptions = [
  ["normal", "Modo normal", "Temi se mueve por el aula."],
  ["demo_safe", "Demo segura", "Temi habla y simula la ruta."]
] as const;
const iconOptions: { key: WorkshopIconKey; label: string }[] = [
  { key: "board", label: "Tablero" },
  { key: "books", label: "Libros" },
  { key: "star", label: "Estrella" },
  { key: "paint", label: "Creativo" },
  { key: "microscope", label: "Explorar" },
  { key: "trophy", label: "Logro" }
];

export function WorkshopPreparationScreen({ assignmentId }: Readonly<Props>) {
  const { approveClassSession, assignments, classSessions, courses, createClassSession, missions, refreshData, robots } = useDemoStore();
  const assignment = assignments.find((item) => item.id === assignmentId) ?? null;
  const mission = missions.find((item) => item.id === assignment?.missionId) ?? null;
  const course = courses.find((item) => item.id === assignment?.courseId) ?? null;
  const assignmentSessions = classSessions.filter((item) => item.assignmentId === assignmentId && item.status !== "completed");
  const defaultSession = assignmentSessions[0] ?? null;
  const suggestedRobot = robots.find((item) => item.courseId === assignment?.courseId) ?? robots[0] ?? null;

  const [form, setForm] = useState<WorkshopForm>(() =>
    buildInitialForm(defaultSession?.robotId ?? suggestedRobot?.id ?? "", defaultSession?.workshop)
  );
  const [robotLocations, setRobotLocations] = useState<RobotLocation[]>([]);
  const [locationError, setLocationError] = useState("");
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);
  const [formError, setFormError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isApproving, setIsApproving] = useState(false);

  const selectedRobot = robots.find((item) => item.id === form.robotId) ?? null;
  const currentSession = assignmentSessions.find((item) => item.robotId === form.robotId) ?? defaultSession ?? null;

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void refreshData();
    }, 5000);

    return () => window.clearInterval(intervalId);
  }, [refreshData]);

  useEffect(() => {
    if (form.robotId || (!defaultSession && !suggestedRobot)) return;
    setForm((current) => ({ ...current, robotId: defaultSession?.robotId ?? suggestedRobot?.id ?? "" }));
  }, [defaultSession, form.robotId, suggestedRobot]);

  useEffect(() => {
    if (!form.robotId) {
      setRobotLocations([]);
      return;
    }

    let cancelled = false;
    void (async () => {
      setIsLoadingLocations(true);
      setLocationError("");
      try {
        const response = await fetch(`/api/robots/${form.robotId}/locations`, { cache: "no-store" });
        const payload = response.ok ? ((await response.json()) as { robotLocations: RobotLocation[] }) : null;
        if (!response.ok) {
          const errorPayload = (await response.json().catch(() => ({ message: "" }))) as { message?: string };
          throw new Error(errorPayload.message || "No pudimos cargar las ubicaciones del robot.");
        }
        if (!cancelled) setRobotLocations(payload?.robotLocations.filter((item) => item.available) ?? []);
      } catch (error) {
        if (!cancelled) {
          setRobotLocations([]);
          setLocationError(error instanceof Error ? error.message : "No pudimos cargar las ubicaciones del robot.");
        }
      } finally {
        if (!cancelled) setIsLoadingLocations(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [form.robotId]);

  useEffect(() => {
    if (robotLocations.length === 0) return;
    setForm((current) => reconcileForm(current, robotLocations));
  }, [robotLocations]);

  const availability = useMemo(() => new Set(robotLocations.map((item) => normalize(item.name))), [robotLocations]);
  const checklist = useMemo(() => buildChecklist(form, selectedRobot, robotLocations, availability), [availability, form, robotLocations, selectedRobot]);
  const checklistItems = buildChecklistItems(checklist, selectedRobot, robotLocations.length);
  const checklistState = !selectedRobot || robotLocations.length === 0 ? "blocked" : checklistItems.every((item) => item.ok) ? "ready" : "needs_review";

  async function handleSave() {
    if (!assignment || !mission || !course || !selectedRobot) {
      setFormError("Todavia no tenemos todos los datos del taller.");
      return;
    }
    if (!checklistItems.every((item) => item.ok)) {
      setFormError("Revisa el checklist del aula antes de guardar.");
      return;
    }

    setIsSaving(true);
    setFormError("");
    setFeedback("");
    try {
      await createClassSession({
        assignmentId: assignment.id,
        robotId: selectedRobot.id,
        workshop: {
          missionType: "classroom_guide",
          workshopName: form.workshopName.trim(),
          studentMode: form.studentMode,
          participationMode: form.participationMode,
          deviceMode: form.deviceMode,
          executionMode: form.executionMode,
          turnDurationMinutes: form.turnDurationMinutes,
          baseLocationName: form.baseLocationName,
          routeSafeConfirmed: form.routeSafeConfirmed,
          executionModeConfirmed: form.executionModeConfirmed,
          checkpoints: form.checkpoints.map((item) => ({
            ...item,
            alias: item.alias.trim(),
            messageText: item.messageText.trim()
          }))
        }
      });
      setFeedback("Taller guardado. El robot queda listo para aprobacion del docente.");
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "No pudimos guardar el taller.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleApprove() {
    if (!currentSession) return;
    setIsApproving(true);
    setFormError("");
    setFeedback("");
    try {
      await approveClassSession(currentSession.id);
      setFeedback("Inicio aprobado. Temi ya puede tomar esta sesion.");
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "No pudimos aprobar el inicio.");
    } finally {
      setIsApproving(false);
    }
  }

  if (!assignment || !mission || !course) {
    return (
      <div className="page-stack">
        <PageHeader eyebrow="Preparar taller" title="Asignacion no disponible" description="Vuelve a biblioteca y elige una mision activa." />
        <div className="empty-state">
          <h2>No encontramos esta asignacion.</h2>
          <Link className="button button-primary" href="/profesor/biblioteca">Ir a biblioteca</Link>
        </div>
      </div>
    );
  }

  if (mission.id !== classroomGuideMissionId) {
    return (
      <div className="page-stack">
        <PageHeader eyebrow="Preparar taller" title={mission.title} description="Esta pantalla esta reservada para Temi guia mi salon." />
        <div className="empty-state">
          <h2>Esta mision sigue usando el flujo general.</h2>
          <Link className="button button-primary" href="/profesor/misiones">Volver a misiones</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Preparar taller"
        title="Temi guia mi salon"
        description="Configura una experiencia clara, segura y atractiva para primaria."
        actions={
          <div className="action-row">
            <Link className="button button-secondary" href="/profesor/misiones">Volver a misiones</Link>
            <Link className="button button-ghost" href="/profesor/biblioteca">Biblioteca</Link>
          </div>
        }
      />

      <section className="featured-mission-hero">
        <div className="featured-mission-copy">
          <p className="eyebrow">Mision principal</p>
          <h2>Un recorrido simple para que Temi presente 3 lugares del aula.</h2>
          <p>{course.name} · Codigo de mision <strong>{assignment.missionCode}</strong></p>
          <ul className="micro-challenge-list">
            <li>Temi saluda</li>
            <li>Temi visita 3 lugares reales</li>
            <li>Temi vuelve al punto base</li>
          </ul>
        </div>
        <div className="featured-mission-aside">
          <span className={`status-pill ${checklistState === "ready" ? "status-pill-ready" : checklistState === "blocked" ? "status-pill-danger" : "status-pill-warning"}`}>
            {checklistState === "ready" ? "Listo" : checklistState === "blocked" ? "Bloqueado" : "Revisar"}
          </span>
          <dl className="definition-panel">
            <div><dt>Robot</dt><dd>{selectedRobot?.displayName ?? "Sin robot"}</dd></div>
            <div><dt>Turno</dt><dd>{form.turnDurationMinutes} min</dd></div>
            <div><dt>Modo</dt><dd>{form.executionMode === "demo_safe" ? "Demo segura" : "Normal"}</dd></div>
          </dl>
        </div>
      </section>

      <section className="workshop-card">
        <div className="section-heading"><h2>Ajustes del taller</h2></div>
        <div className="workshop-form-grid">
          <label className="field" htmlFor="workshop-name">
            Nombre del taller
            <input id="workshop-name" maxLength={120} onChange={(event) => setForm((current) => ({ ...current, workshopName: event.target.value }))} value={form.workshopName} />
          </label>
          <label className="field" htmlFor="workshop-robot">
            Robot
            <select id="workshop-robot" onChange={(event) => setForm((current) => ({ ...current, robotId: event.target.value }))} value={form.robotId}>
              {robots.map((robot) => <option key={robot.id} value={robot.id}>{robot.displayName}</option>)}
            </select>
          </label>
          <label className="field" htmlFor="turn-duration">
            Tiempo por turno
            <select id="turn-duration" onChange={(event) => setForm((current) => ({ ...current, turnDurationMinutes: Number(event.target.value) || 7 }))} value={String(form.turnDurationMinutes)}>
              {durationOptions.map((duration) => <option key={duration} value={duration}>{duration} min</option>)}
            </select>
          </label>
        </div>

        <fieldset className="choice-fieldset">
          <legend>Modo del estudiante</legend>
          <div className="choice-grid choice-grid-two">
            {studentModeOptions.map(([value, title, description]) => (
              <button aria-pressed={form.studentMode === value} className="choice-card" key={value} onClick={() => setForm((current) => ({ ...current, studentMode: value }))} type="button">
                <strong>{title}</strong>
                <span>{description}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="choice-fieldset">
          <legend>Modo de participacion</legend>
          <div className="choice-grid choice-grid-two">
            {participationOptions.map(([value, title, description]) => (
              <button aria-pressed={form.participationMode === value} className="choice-card" key={value} onClick={() => setForm((current) => ({ ...current, participationMode: value }))} type="button">
                <strong>{title}</strong>
                <span>{description}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="choice-fieldset">
          <legend>Modo de dispositivo</legend>
          <div className="choice-grid choice-grid-three">
            {deviceOptions.map(([value, title]) => (
              <button aria-pressed={form.deviceMode === value} className="choice-card" key={value} onClick={() => setForm((current) => ({ ...current, deviceMode: value }))} type="button">
                <strong>{title}</strong>
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="choice-fieldset">
          <legend>Modo de ejecucion</legend>
          <div className="choice-grid choice-grid-two">
            {executionOptions.map(([value, title, description]) => (
              <button aria-pressed={form.executionMode === value} className="choice-card" key={value} onClick={() => setForm((current) => ({ ...current, executionMode: value }))} type="button">
                <strong>{title}</strong>
                <span>{description}</span>
              </button>
            ))}
          </div>
        </fieldset>
      </section>

      <section className="workshop-card">
        <div className="section-heading">
          <h2>Ubicaciones del recorrido</h2>
          <p className="muted">{isLoadingLocations ? "Cargando ubicaciones reales..." : `${robotLocations.length} ubicaciones disponibles`}</p>
        </div>
        {locationError ? <p className="form-error">{locationError}</p> : null}
        <label className="field" htmlFor="base-location">
          Punto base del robot
          <select id="base-location" onChange={(event) => setForm((current) => ({ ...current, baseLocationName: event.target.value }))} value={form.baseLocationName}>
            {robotLocations.map((location) => <option key={location.id} value={location.name}>{toTitleCase(location.name)}</option>)}
          </select>
        </label>

        <div className="checkpoint-stack">
          {form.checkpoints.map((checkpoint, index) => {
            const usedByOthers = new Set(form.checkpoints.filter((_, checkpointIndex) => checkpointIndex !== index).map((item) => normalize(item.locationName)));
            return (
              <div className="checkpoint-editor" key={`checkpoint-${index + 1}`}>
                <div className="checkpoint-heading">
                  <div>
                    <p className="eyebrow">Parada {index + 1}</p>
                    <h3>{checkpoint.alias || `Lugar ${index + 1}`}</h3>
                  </div>
                  <span className="status-pill status-pill-neutral">{iconOptions.find((item) => item.key === checkpoint.iconKey)?.label}</span>
                </div>

                <div className="workshop-form-grid">
                  <label className="field" htmlFor={`checkpoint-location-${index}`}>
                    Ubicacion real
                    <select id={`checkpoint-location-${index}`} onChange={(event) => updateCheckpoint(setForm, index, { locationName: event.target.value })} value={checkpoint.locationName}>
                      {robotLocations.map((location) => (
                        <option disabled={usedByOthers.has(normalize(location.name))} key={location.id} value={location.name}>
                          {toTitleCase(location.name)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field" htmlFor={`checkpoint-alias-${index}`}>
                    Alias amigable
                    <input id={`checkpoint-alias-${index}`} maxLength={40} onChange={(event) => updateCheckpoint(setForm, index, { alias: event.target.value })} value={checkpoint.alias} />
                  </label>
                </div>

                <fieldset className="choice-fieldset">
                  <legend>Icono visible</legend>
                  <div className="icon-choice-grid">
                    {iconOptions.map((option) => (
                      <button aria-pressed={checkpoint.iconKey === option.key} className="icon-choice" key={option.key} onClick={() => updateCheckpoint(setForm, index, { iconKey: option.key })} type="button">
                        {option.label}
                      </button>
                    ))}
                  </div>
                </fieldset>

                <fieldset className="choice-fieldset">
                  <legend>Mensaje de Temi</legend>
                  <div className="choice-grid choice-grid-two">
                    {(["template", "custom"] as const).map((mode) => (
                      <button aria-pressed={checkpoint.messageMode === mode} className="choice-card" key={mode} onClick={() => updateCheckpoint(setForm, index, { messageMode: mode })} type="button">
                        <strong>{mode === "template" ? "Plantilla corta" : "Texto libre"}</strong>
                        <span>{mode === "template" ? "Mensaje amable y automatico." : "Frase corta creada por el docente."}</span>
                      </button>
                    ))}
                  </div>
                </fieldset>

                <label className="field" htmlFor={`checkpoint-message-${index}`}>
                  Mensaje corto
                  <textarea id={`checkpoint-message-${index}`} maxLength={90} onChange={(event) => updateCheckpoint(setForm, index, { messageText: event.target.value })} rows={3} value={checkpoint.messageText} />
                  <small>{checkpoint.messageText.length}/90 caracteres</small>
                </label>
              </div>
            );
          })}
        </div>
      </section>

      <section className="workshop-card">
        <div className="section-heading">
          <h2>Checklist del aula</h2>
          <span className={`status-pill ${checklistState === "ready" ? "status-pill-ready" : checklistState === "blocked" ? "status-pill-danger" : "status-pill-warning"}`}>
            {checklistState === "ready" ? "Listo" : checklistState === "blocked" ? "Bloqueado" : "Revisar"}
          </span>
        </div>
        <div className="checklist-grid">
          {checklistItems.map((item) => (
            <div className={`checklist-item ${item.ok ? "checklist-item-ok" : "checklist-item-pending"}`} key={item.label}>
              <strong>{item.label}</strong>
              <p>{item.description}</p>
            </div>
          ))}
        </div>
        <div className="toggle-grid">
          <label className="toggle-field"><input checked={form.routeSafeConfirmed} onChange={(event) => setForm((current) => ({ ...current, routeSafeConfirmed: event.target.checked }))} type="checkbox" /> Confirme que la ruta esta despejada.</label>
          <label className="toggle-field"><input checked={form.executionModeConfirmed} onChange={(event) => setForm((current) => ({ ...current, executionModeConfirmed: event.target.checked }))} type="checkbox" /> Confirme el modo elegido antes de iniciar.</label>
        </div>
        {form.executionMode === "demo_safe" ? <p className="success-message">Demo segura activa: Temi hablara y mostrara el recorrido sin desplazarse.</p> : <p className="hint">Modo normal: revisa mochilas, sillas y zonas estrechas antes de aprobar.</p>}
      </section>

      <section className="workshop-card">
        <div className="section-heading">
          <h2>Sesion actual del robot</h2>
          <span className="status-pill status-pill-neutral">{formatSessionStatus(currentSession?.status ?? "none")}</span>
        </div>
        <p className="muted">{currentSession ? `${selectedRobot?.displayName ?? "Robot"} · ${currentSession.currentStepLabel ?? "Sin detalle"}` : "Aun no hemos guardado esta configuracion como sesion activa."}</p>
        {formError ? <p className="form-error">{formError}</p> : null}
        {feedback ? <p className="success-message">{feedback}</p> : null}
        <div className="action-row">
          <button className="button button-primary" disabled={isSaving || robots.length === 0} onClick={() => void handleSave()} type="button">{isSaving ? "Guardando..." : currentSession ? "Actualizar taller" : "Guardar y preparar robot"}</button>
          <button className="button button-secondary" disabled={!currentSession || currentSession.status !== "pending_approval" || isApproving} onClick={() => void handleApprove()} type="button">{isApproving ? "Aprobando..." : "Aprobar inicio"}</button>
        </div>
      </section>
    </div>
  );
}

function buildInitialForm(robotId: string, workshop?: { workshopName: string; studentMode: WorkshopStudentMode; participationMode: WorkshopParticipationMode; deviceMode: WorkshopDeviceMode; executionMode: WorkshopExecutionMode; turnDurationMinutes: number; baseLocationName: string; checkpoints: WorkshopCheckpoint[]; checklist: { routeSafeConfirmed: boolean; executionModeConfirmed: boolean } }): WorkshopForm {
  return {
    robotId,
    workshopName: workshop?.workshopName ?? "Temi guia mi salon",
    studentMode: workshop?.studentMode ?? "guided",
    participationMode: workshop?.participationMode ?? "teams",
    deviceMode: workshop?.deviceMode ?? "team_device",
    executionMode: workshop?.executionMode ?? "normal",
    turnDurationMinutes: workshop?.turnDurationMinutes ?? 7,
    baseLocationName: workshop?.baseLocationName ?? "",
    routeSafeConfirmed: workshop?.checklist.routeSafeConfirmed ?? false,
    executionModeConfirmed: workshop?.checklist.executionModeConfirmed ?? false,
    checkpoints: workshop?.checkpoints.length === 3 ? workshop.checkpoints : [0, 1, 2].map((index) => blankCheckpoint(index))
  };
}

function blankCheckpoint(index: number): WorkshopCheckpoint {
  return { locationName: "", alias: "", iconKey: iconOptions[index]?.key ?? "star", messageMode: "template", messageText: "" };
}

function reconcileForm(form: WorkshopForm, robotLocations: RobotLocation[]) {
  const used = new Set<string>();
  const checkpoints = [0, 1, 2].map((index) => {
    const current = form.checkpoints[index] ?? blankCheckpoint(index);
    let locationName = current.locationName;
    if (!locationName || used.has(normalize(locationName)) || !robotLocations.some((location) => normalize(location.name) === normalize(locationName))) {
      locationName = nextLocation(robotLocations, used) ?? robotLocations[index]?.name ?? robotLocations[0]?.name ?? "";
    }
    if (locationName) used.add(normalize(locationName));
    const alias = current.alias.trim() || toTitleCase(locationName || `Lugar ${index + 1}`);
    return {
      ...current,
      locationName,
      alias,
      messageText: current.messageText.trim() || templateMessage(alias || locationName, index)
    };
  });

  return {
    ...form,
    baseLocationName: robotLocations.some((location) => normalize(location.name) === normalize(form.baseLocationName))
      ? form.baseLocationName
      : robotLocations[0]?.name ?? "",
    checkpoints
  };
}

function nextLocation(robotLocations: RobotLocation[], used: Set<string>) {
  return robotLocations.find((location) => !used.has(normalize(location.name)))?.name;
}

function updateCheckpoint(
  setForm: Dispatch<SetStateAction<WorkshopForm>>,
  index: number,
  patch: Partial<WorkshopCheckpoint>
) {
  setForm((current) => {
    const checkpoints = [...current.checkpoints];
    const previous = checkpoints[index];
    const next = { ...previous, ...patch };
    const alias = next.alias.trim() || toTitleCase(next.locationName || `Lugar ${index + 1}`);
    checkpoints[index] = {
      ...next,
      alias,
      messageText:
        next.messageMode === "template" && (!next.messageText.trim() || patch.alias !== undefined || patch.locationName !== undefined || patch.messageMode !== undefined)
          ? templateMessage(alias || next.locationName, index)
          : next.messageText
    };
    return { ...current, checkpoints };
  });
}

function buildChecklist(form: WorkshopForm, robot: { connectionState: string; batteryPercent?: number } | null, robotLocations: RobotLocation[], availability: Set<string>) {
  const checkpointNames = form.checkpoints.map((item) => normalize(item.locationName)).filter(Boolean);
  const uniqueCheckpointNames = new Set(checkpointNames);
  return {
    robotConnected: robot?.connectionState === "CONNECTED",
    batteryReady: (robot?.batteryPercent ?? 0) >= 40,
    mapReady: robotLocations.length >= 3,
    checkpointsReady:
      checkpointNames.length === 3 &&
      uniqueCheckpointNames.size === 3 &&
      checkpointNames.every((name) => availability.has(name)) &&
      form.checkpoints.every((item) => item.alias.trim().length >= 2 && item.messageText.trim().length >= 5 && item.messageText.trim().length <= 90),
    baseReady: availability.has(normalize(form.baseLocationName)),
    routeSafeConfirmed: form.routeSafeConfirmed,
    executionModeConfirmed: form.executionModeConfirmed
  };
}

function buildChecklistItems(checklist: ReturnType<typeof buildChecklist>, robot: { displayName: string; batteryPercent?: number } | null, locationCount: number) {
  return [
    { label: "Robot conectado", description: robot ? `${robot.displayName} disponible para el aula.` : "Selecciona un robot.", ok: checklist.robotConnected },
    { label: "Bateria suficiente", description: `Necesitamos al menos 40%. Ahora va en ${robot?.batteryPercent ?? 0}%.`, ok: checklist.batteryReady },
    { label: "Mapa listo", description: `${locationCount} ubicaciones reales sincronizadas.`, ok: checklist.mapReady },
    { label: "Tres ubicaciones validas", description: "El recorrido usa tres puntos distintos.", ok: checklist.checkpointsReady },
    { label: "Punto base valido", description: "Temi sabe a donde volver al final.", ok: checklist.baseReady },
    { label: "Ruta segura confirmada", description: "El docente reviso el espacio antes de iniciar.", ok: checklist.routeSafeConfirmed },
    { label: "Modo confirmado", description: "Se reviso si el taller va en normal o demo segura.", ok: checklist.executionModeConfirmed }
  ];
}

function templateMessage(aliasSource: string, index: number) {
  const alias = toTitleCase(aliasSource || `Lugar ${index + 1}`);
  const templates = [
    `${alias}. Aqui aprendemos juntos cada dia.`,
    `${alias}. En este lugar compartimos ideas y descubrimos cosas nuevas.`,
    `${alias}. Este espacio guarda trabajos y momentos importantes del salon.`
  ];
  return (templates[index] ?? `${alias}. Este lugar es importante para nuestro grupo.`).slice(0, 90);
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function toTitleCase(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ");
}

function formatSessionStatus(status: string) {
  switch (status) {
    case "pending_approval":
      return "Pendiente de aprobacion";
    case "ready":
      return "Lista para robot";
    case "running":
      return "En ejecucion";
    case "paused":
      return "En pausa";
    case "safe_mode":
      return "Modo seguro";
    case "error":
      return "Con error";
    case "completed":
      return "Completada";
    default:
      return "Sin sesion";
  }
}
