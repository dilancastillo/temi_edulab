"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { useDemoStore } from "@/components/demo-store-provider";
import type { Campus, InstitutionBranding, InstitutionPolicy, InstitutionTemplate, LearningSpace } from "@/lib/types";
import type { CSSProperties, ReactNode } from "react";

const levelOptions = [
  ["PREESCOLAR", "Preescolar"],
  ["BASICA_PRIMARIA", "Basica primaria"],
  ["BASICA_SECUNDARIA", "Basica secundaria"],
  ["MEDIA", "Media"]
] as const;

const spaceKinds = [
  ["classroom", "Aula"],
  ["library", "Biblioteca"],
  ["lab", "Laboratorio"],
  ["auditorium", "Auditorio"],
  ["makerspace", "Aula maker"],
  ["office", "Oficina"],
  ["other", "Otro"]
] as const;

const rolePresets = [
  ["teacher", "Docente"],
  ["institution_admin", "Admin institucional"],
  ["academic_coordinator", "Coordinador academico"],
  ["technical_support", "Soporte tecnico"]
] as const;

const templateKinds = [
  ["workshop_guide", "Guia de taller"],
  ["report", "Reporte"],
  ["certificate", "Certificado"],
  ["communication", "Comunicado"],
  ["rubric", "Rubrica"],
  ["consent", "Permiso acudiente"]
] as const;

type RolePreset = (typeof rolePresets)[number][0];
type TemplateFormKind = (typeof templateKinds)[number][0];

export function InstitutionAdminScreen() {
  const {
    addInstitutionCampus,
    addInstitutionSpace,
    addInstitutionStaff,
    addInstitutionTemplate,
    courses,
    institution,
    institutional,
    publishInstitutionPolicy,
    robots,
    students,
    updateInstitutionBranding,
    updateInstitutionSettings
  } = useDemoStore();
  const [settings, setSettings] = useState({
    name: institution.name,
    legalName: institution.legalName ?? institution.name,
    daneCode: institution.daneCode ?? "",
    department: institution.department ?? "Boyaca",
    city: institution.city ?? "Tunja",
    defaultLocale: institution.defaultLocale,
    enabledLevels: institution.enabledLevels.length ? institution.enabledLevels : ["BASICA_PRIMARIA", "BASICA_SECUNDARIA", "MEDIA"],
    marketingConsentEnabled: institution.marketingConsentEnabled
  });
  const [branding, setBranding] = useState(() => buildBrandingState(institutional.branding));
  const [campus, setCampus] = useState({ name: "", city: institution.city ?? "Tunja", address: "", phone: "" });
  const [space, setSpace] = useState({
    campusId: institutional.campuses[0]?.id ?? "",
    floorName: "Piso 1",
    levelNumber: 1,
    name: "",
    kind: "classroom",
    capacity: 30,
    safetyNotes: "",
    accessibilityNotes: "",
    isRobotReady: true
  });
  const [staff, setStaff] = useState({
    fullName: "",
    email: "",
    password: "demo2026",
    rolePreset: "teacher" as RolePreset,
    courseId: courses[0]?.id ?? ""
  });
  const [template, setTemplate] = useState({
    kind: "workshop_guide" as TemplateFormKind,
    name: "",
    content: "Plantilla para {curso}, {docente}, {fecha} y {mision}.",
    variables: "curso, docente, fecha, mision",
    requiresApproval: true
  });
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const activeLicense = institutional.licenses[0] ?? null;
  const teachers = useMemo(() => institutional.summary.activeTeachers, [institutional.summary.activeTeachers]);
  const sortedSpaces = useMemo(() => [...institutional.spaces].sort((a, b) => a.name.localeCompare(b.name)), [institutional.spaces]);

  async function runAction(action: () => Promise<void>, success: string) {
    setError("");
    setFeedback("");
    try {
      await action();
      setFeedback(success);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "No pudimos guardar el cambio.");
    }
  }

  function toggleLevel(level: string) {
    setSettings((current) => {
      const exists = current.enabledLevels.includes(level);
      const enabledLevels = exists ? current.enabledLevels.filter((item) => item !== level) : [...current.enabledLevels, level];
      return { ...current, enabledLevels: enabledLevels.length ? enabledLevels : current.enabledLevels };
    });
  }

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Centro institucional"
        title={institution.name || "Institucion"}
        description="Configura el colegio, gobierna permisos, prepara robots y revisa el uso institucional."
      />

      <section className="metric-grid" aria-label="Indicadores institucionales">
        <Metric label="Sedes" value={institutional.summary.campuses} />
        <Metric label="Espacios" value={institutional.summary.spaces} />
        <Metric label="Docentes activos" value={teachers} />
        <Metric label="Estudiantes" value={institutional.summary.activeStudents || students.length} />
        <Metric label="Robots conectados" value={`${institutional.summary.connectedRobots}/${institutional.summary.robots || robots.length}`} />
        <Metric label="Politicas publicadas" value={institutional.summary.publishedPolicies} />
      </section>

      {feedback ? <p className="success-message">{feedback}</p> : null}
      {error ? <p className="form-error">{error}</p> : null}

      <section className="institution-grid">
        <Panel title="Identidad del colegio" subtitle="Datos base, idioma y niveles habilitados.">
          <form
            className="form-stack"
            onSubmit={(event) => {
              event.preventDefault();
              void runAction(() => updateInstitutionSettings(settings), "Configuracion institucional guardada.");
            }}
          >
            <div className="workshop-form-grid">
              <Field label="Nombre visible" value={settings.name} onChange={(value) => setSettings((current) => ({ ...current, name: value }))} />
              <Field label="Razon social" value={settings.legalName} onChange={(value) => setSettings((current) => ({ ...current, legalName: value }))} />
              <Field label="Codigo DANE" value={settings.daneCode} onChange={(value) => setSettings((current) => ({ ...current, daneCode: value }))} />
              <Field label="Departamento" value={settings.department} onChange={(value) => setSettings((current) => ({ ...current, department: value }))} />
              <Field label="Ciudad" value={settings.city} onChange={(value) => setSettings((current) => ({ ...current, city: value }))} />
              <label className="field" htmlFor="institution-locale">
                Idioma por defecto
                <select
                  id="institution-locale"
                  value={settings.defaultLocale}
                  onChange={(event) => setSettings((current) => ({ ...current, defaultLocale: event.target.value as "es-CO" | "en-US" }))}
                >
                  <option value="es-CO">Espanol Colombia</option>
                  <option value="en-US">English</option>
                </select>
              </label>
            </div>
            <div className="chip-list" aria-label="Niveles habilitados">
              {levelOptions.map(([value, label]) => (
                <button
                  aria-pressed={settings.enabledLevels.includes(value)}
                  className="filter-chip"
                  key={value}
                  onClick={() => toggleLevel(value)}
                  type="button"
                >
                  {label}
                </button>
              ))}
            </div>
            <label className="toggle-field">
              <input
                checked={settings.marketingConsentEnabled}
                onChange={(event) => setSettings((current) => ({ ...current, marketingConsentEnabled: event.target.checked }))}
                type="checkbox"
              />
              Permitir piezas de marketing institucional con evidencias aprobadas.
            </label>
            <button className="button button-primary" type="submit">
              Guardar colegio
            </button>
          </form>
        </Panel>

        <Panel title="Licencia" subtitle="La licencia restringe uso cuando vence o supera cupos.">
          {activeLicense ? (
            <dl className="definition-panel">
              <Definition label="Plan" value={activeLicense.name} />
              <Definition label="Estado" value={licenseLabel(activeLicense.status)} />
              <Definition label="Vigencia" value={`${formatDate(activeLicense.startsAt)} - ${formatDate(activeLicense.endsAt)}`} />
              <Definition label="Robots" value={`${robots.length}/${activeLicense.maxRobots}`} />
              <Definition label="Docentes" value={`${teachers}/${activeLicense.maxTeachers}`} />
              <Definition label="Estudiantes" value={`${students.length}/${activeLicense.maxStudents}`} />
            </dl>
          ) : (
            <p className="muted">No hay licencia activa registrada.</p>
          )}
        </Panel>
      </section>

      <section className="institution-grid">
        <Panel title="Sedes y espacios" subtitle="Jerarquia: institucion, sede, piso y aula.">
          <form
            className="form-stack"
            onSubmit={(event) => {
              event.preventDefault();
              void runAction(() => addInstitutionCampus(campus), "Sede creada.");
              setCampus((current) => ({ ...current, name: "", address: "" }));
            }}
          >
            <div className="workshop-form-grid">
              <Field label="Nueva sede" value={campus.name} onChange={(value) => setCampus((current) => ({ ...current, name: value }))} />
              <Field label="Ciudad" value={campus.city} onChange={(value) => setCampus((current) => ({ ...current, city: value }))} />
              <Field label="Direccion" value={campus.address} onChange={(value) => setCampus((current) => ({ ...current, address: value }))} />
              <Field label="Telefono" value={campus.phone} onChange={(value) => setCampus((current) => ({ ...current, phone: value }))} />
            </div>
            <button className="button button-secondary" type="submit">
              Crear sede
            </button>
          </form>

          <form
            className="form-stack compact-form"
            onSubmit={(event) => {
              event.preventDefault();
              void runAction(() => addInstitutionSpace(space), "Espacio creado.");
              setSpace((current) => ({ ...current, name: "" }));
            }}
          >
            <div className="workshop-form-grid">
              <label className="field" htmlFor="space-campus">
                Sede
                <select id="space-campus" value={space.campusId} onChange={(event) => setSpace((current) => ({ ...current, campusId: event.target.value }))}>
                  {institutional.campuses.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <Field label="Piso" value={space.floorName} onChange={(value) => setSpace((current) => ({ ...current, floorName: value }))} />
              <NumberField label="Nivel" value={space.levelNumber} onChange={(value) => setSpace((current) => ({ ...current, levelNumber: value }))} />
              <Field label="Espacio" value={space.name} onChange={(value) => setSpace((current) => ({ ...current, name: value }))} />
              <label className="field" htmlFor="space-kind">
                Tipo
                <select id="space-kind" value={space.kind} onChange={(event) => setSpace((current) => ({ ...current, kind: event.target.value }))}>
                  {spaceKinds.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <NumberField label="Capacidad" value={space.capacity} onChange={(value) => setSpace((current) => ({ ...current, capacity: value }))} />
            </div>
            <Field label="Notas de seguridad" value={space.safetyNotes} onChange={(value) => setSpace((current) => ({ ...current, safetyNotes: value }))} />
            <Field label="Accesibilidad" value={space.accessibilityNotes} onChange={(value) => setSpace((current) => ({ ...current, accessibilityNotes: value }))} />
            <label className="toggle-field">
              <input checked={space.isRobotReady} onChange={(event) => setSpace((current) => ({ ...current, isRobotReady: event.target.checked }))} type="checkbox" />
              Este espacio esta listo para robot.
            </label>
            <button className="button button-secondary" disabled={institutional.campuses.length === 0} type="submit">
              Crear espacio
            </button>
          </form>
          <SpaceList campuses={institutional.campuses} spaces={sortedSpaces} />
        </Panel>

        <Panel title="Docentes y permisos" subtitle="Roles simples con permisos por modulo.">
          <form
            className="form-stack"
            onSubmit={(event) => {
              event.preventDefault();
              void runAction(() => addInstitutionStaff(staff), "Usuario institucional creado.");
              setStaff((current) => ({ ...current, fullName: "", email: "" }));
            }}
          >
            <div className="workshop-form-grid">
              <Field label="Nombre" value={staff.fullName} onChange={(value) => setStaff((current) => ({ ...current, fullName: value }))} />
              <Field label="Correo" type="email" value={staff.email} onChange={(value) => setStaff((current) => ({ ...current, email: value }))} />
              <Field label="Contrasena inicial" type="password" value={staff.password} onChange={(value) => setStaff((current) => ({ ...current, password: value }))} />
              <label className="field" htmlFor="staff-role">
                Rol
                <select id="staff-role" value={staff.rolePreset} onChange={(event) => setStaff((current) => ({ ...current, rolePreset: event.target.value as RolePreset }))}>
                  {rolePresets.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field" htmlFor="staff-course">
                Curso base
                <select id="staff-course" value={staff.courseId} onChange={(event) => setStaff((current) => ({ ...current, courseId: event.target.value }))}>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <button className="button button-primary" type="submit">
              Crear usuario
            </button>
          </form>
        </Panel>
      </section>

      <section className="institution-grid">
        <Panel title="Branding y marketing" subtitle="Marca institucional con control de contraste.">
          <form
            className="form-stack"
            onSubmit={(event) => {
              event.preventDefault();
              void runAction(() => updateInstitutionBranding(branding), "Branding institucional guardado.");
            }}
          >
            <div className="brand-preview" style={{ "--brand-primary": branding.primaryColor, "--brand-accent": branding.accentColor, "--brand-neutral": branding.neutralColor } as CSSProperties}>
              <strong>{institution.name}</strong>
              <span>{branding.marketingHeadline || "Aprendizaje STEAM con identidad institucional"}</span>
            </div>
            <div className="workshop-form-grid">
              <ColorField label="Color principal" value={branding.primaryColor} onChange={(value) => setBranding((current) => ({ ...current, primaryColor: value }))} />
              <ColorField label="Color acento" value={branding.accentColor} onChange={(value) => setBranding((current) => ({ ...current, accentColor: value }))} />
              <ColorField label="Fondo claro" value={branding.neutralColor} onChange={(value) => setBranding((current) => ({ ...current, neutralColor: value }))} />
              <Field label="Logo URL" value={branding.logoUrl ?? ""} onChange={(value) => setBranding((current) => ({ ...current, logoUrl: value }))} />
              <Field label="Titular marketing" value={branding.marketingHeadline ?? ""} onChange={(value) => setBranding((current) => ({ ...current, marketingHeadline: value }))} />
              <Field label="Mensaje de bienvenida" value={branding.welcomeMessage ?? ""} onChange={(value) => setBranding((current) => ({ ...current, welcomeMessage: value }))} />
            </div>
            <Field label="Pie de reportes" value={branding.reportFooter ?? ""} onChange={(value) => setBranding((current) => ({ ...current, reportFooter: value }))} />
            <button className="button button-primary" type="submit">
              Guardar marca
            </button>
          </form>
        </Panel>

        <Panel title="Robots e inventario" subtitle="Estado operativo, aula, licencia y mantenimiento.">
          <div className="assignment-list compact-list">
            {robots.map((robot) => (
              <article className="assignment-card" key={robot.id}>
                <div className="mission-symbol mission-symbol-blue" aria-hidden="true" />
                <div>
                  <h3>{robot.displayName}</h3>
                  <p>{robot.modelName ?? "Temi V3"} - {robot.classroomName ?? "Sin aula asignada"}</p>
                  <p className="muted">
                    {robot.connectionState} - bateria {robot.batteryPercent ?? "--"}% - {robot.maintenanceStatus ?? "Sin mantenimiento"}
                  </p>
                  <p className="muted">{robot.serialNumber ?? "Serial pendiente"} - SDK {robot.sdkVersion ?? "pendiente"}</p>
                </div>
              </article>
            ))}
          </div>
          <div className="assignment-list compact-list">
            {institutional.maintenanceRecords.map((record) => (
              <article className="mini-row" key={record.id}>
                <strong>{record.kind}</strong>
                <span>{record.status}</span>
                <small>{record.dueAt ? formatDate(record.dueAt) : "Sin fecha"}</small>
              </article>
            ))}
          </div>
        </Panel>
      </section>

      <section className="institution-grid">
        <Panel title="Politicas de datos" subtitle="Versionado, publicacion y trazabilidad de aceptacion.">
          <div className="policy-stack">
            {institutional.policies.map((policy) => (
              <PolicyItem
                key={policy.id}
                policy={policy}
                onPublish={() => runAction(() => publishInstitutionPolicy(policy.id, { content: policy.content }), "Politica publicada.")}
              />
            ))}
          </div>
        </Panel>

        <Panel title="Plantillas institucionales" subtitle="Reportes, guias, certificados y rubricas con variables.">
          <form
            className="form-stack"
            onSubmit={(event) => {
              event.preventDefault();
              void runAction(
                () =>
                  addInstitutionTemplate({
                    ...template,
                    variables: template.variables
                      .split(",")
                      .map((item) => item.trim())
                      .filter(Boolean)
                  }),
                "Plantilla creada."
              );
              setTemplate((current) => ({ ...current, name: "" }));
            }}
          >
            <div className="workshop-form-grid">
              <label className="field" htmlFor="template-kind">
                Tipo
                <select id="template-kind" value={template.kind} onChange={(event) => setTemplate((current) => ({ ...current, kind: event.target.value as TemplateFormKind }))}>
                  {templateKinds.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <Field label="Nombre" value={template.name} onChange={(value) => setTemplate((current) => ({ ...current, name: value }))} />
              <Field label="Variables" value={template.variables} onChange={(value) => setTemplate((current) => ({ ...current, variables: value }))} />
            </div>
            <label className="field" htmlFor="template-content">
              Contenido
              <textarea id="template-content" rows={4} value={template.content} onChange={(event) => setTemplate((current) => ({ ...current, content: event.target.value }))} />
            </label>
            <label className="toggle-field">
              <input checked={template.requiresApproval} onChange={(event) => setTemplate((current) => ({ ...current, requiresApproval: event.target.checked }))} type="checkbox" />
              Requiere aprobacion antes de usarse.
            </label>
            <button className="button button-secondary" type="submit">
              Crear plantilla
            </button>
          </form>
          <TemplateList templates={institutional.templates} />
        </Panel>
      </section>

      <section className="institution-grid">
        <Panel title="Reportes institucionales" subtitle="Vista ejecutiva por sede, curso, docente y robot.">
          <div className="report-grid">
            {institutional.reportSnapshots.map((report) => (
              <article className="report-tile" key={report.id}>
                <strong>{report.title}</strong>
                <span>{formatDate(report.rangeStart)} - {formatDate(report.rangeEnd)}</span>
                <small>{Object.entries(report.metrics).map(([key, value]) => `${key}: ${String(value)}`).join(" - ")}</small>
              </article>
            ))}
          </div>
        </Panel>

        <Panel title="Auditoria" subtitle="Acciones criticas institucionales.">
          <div className="assignment-list compact-list">
            {institutional.auditLogs.length === 0 ? <p className="muted">Aun no hay eventos de auditoria.</p> : null}
            {institutional.auditLogs.map((log) => (
              <article className="mini-row" key={log.id}>
                <strong>{auditLabel(log.action)}</strong>
                <span>{log.resourceType}</span>
                <small>{formatDateTime(log.createdAt)}</small>
              </article>
            ))}
          </div>
        </Panel>
      </section>
    </div>
  );
}

function Metric({ label, value }: Readonly<{ label: string; value: string | number }>) {
  return (
    <article className="metric-card">
      <span className="metric-icon metric-icon-blue" aria-hidden="true" />
      <p>{label}</p>
      <strong>{value}</strong>
    </article>
  );
}

function Panel({ children, subtitle, title }: Readonly<{ children: ReactNode; subtitle: string; title: string }>) {
  return (
    <section className="panel-section institution-panel">
      <div className="section-heading">
        <div>
          <h2>{title}</h2>
          <p className="muted">{subtitle}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function Field({ label, onChange, type = "text", value }: Readonly<{ label: string; onChange: (value: string) => void; type?: string; value: string }>) {
  const id = label.toLowerCase().replace(/\s+/g, "-");
  return (
    <label className="field" htmlFor={id}>
      {label}
      <input id={id} type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function NumberField({ label, onChange, value }: Readonly<{ label: string; onChange: (value: number) => void; value: number }>) {
  const id = label.toLowerCase().replace(/\s+/g, "-");
  return (
    <label className="field" htmlFor={id}>
      {label}
      <input id={id} type="number" value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}

function ColorField({ label, onChange, value }: Readonly<{ label: string; onChange: (value: string) => void; value: string }>) {
  const id = label.toLowerCase().replace(/\s+/g, "-");
  return (
    <label className="field color-field" htmlFor={id}>
      {label}
      <input id={id} type="color" value={value} onChange={(event) => onChange(event.target.value)} />
      <span>{value}</span>
    </label>
  );
}

function Definition({ label, value }: Readonly<{ label: string; value: string | number }>) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function SpaceList({ campuses, spaces }: Readonly<{ campuses: Campus[]; spaces: LearningSpace[] }>) {
  if (spaces.length === 0) {
    return <p className="muted">Crea al menos un espacio para activar ubicaciones institucionales.</p>;
  }

  return (
    <div className="assignment-list compact-list">
      {spaces.slice(0, 6).map((space) => (
        <article className="mini-row" key={space.id}>
          <strong>{space.name}</strong>
          <span>{campuses.find((campus) => campus.id === space.campusId)?.name ?? "Sede"}</span>
          <small>{space.isRobotReady ? "Listo para robot" : "Pendiente"}</small>
        </article>
      ))}
    </div>
  );
}

function PolicyItem({ onPublish, policy }: Readonly<{ onPublish: () => void; policy: InstitutionPolicy }>) {
  return (
    <article className="policy-item">
      <div>
        <h3>{policy.title}</h3>
        <p>{policy.sourceReference ?? "Plantilla institucional"}</p>
      </div>
      <span className={`status-pill ${policy.status === "published" ? "status-pill-ready" : "status-pill-warning"}`}>{policy.status === "published" ? "Publicada" : "Borrador"}</span>
      <button className="button button-secondary" onClick={onPublish} type="button">
        Publicar
      </button>
    </article>
  );
}

function TemplateList({ templates }: Readonly<{ templates: InstitutionTemplate[] }>) {
  if (templates.length === 0) {
    return <p className="muted">Aun no hay plantillas institucionales.</p>;
  }

  return (
    <div className="assignment-list compact-list">
      {templates.slice(0, 5).map((item) => (
        <article className="mini-row" key={item.id}>
          <strong>{item.name}</strong>
          <span>{templateKindLabel(item.kind)}</span>
          <small>{templateStatusLabel(item.status)}</small>
        </article>
      ))}
    </div>
  );
}

function buildBrandingState(branding: InstitutionBranding | null) {
  return {
    logoUrl: branding?.logoUrl ?? "",
    sealUrl: branding?.sealUrl ?? "",
    primaryColor: branding?.primaryColor ?? "#2856a6",
    accentColor: branding?.accentColor ?? "#1f9d55",
    neutralColor: branding?.neutralColor ?? "#f4f7fb",
    marketingHeadline: branding?.marketingHeadline ?? "Robotica educativa para aprender creando",
    welcomeMessage: branding?.welcomeMessage ?? "Bienvenidos a una experiencia STEAM con Temi.",
    reportFooter: branding?.reportFooter ?? "Reporte generado por Esbot EduLab."
  };
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-CO", { dateStyle: "medium" }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("es-CO", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function licenseLabel(status: string) {
  return status === "trial" ? "Piloto" : status === "active" ? "Activa" : status === "expired" ? "Vencida" : "Suspendida";
}

function auditLabel(action: string) {
  return action === "created" ? "Creado" : action === "updated" ? "Actualizado" : action === "published" ? "Publicado" : action;
}

function templateKindLabel(kind: string) {
  return templateKinds.find(([value]) => value === kind)?.[1] ?? kind;
}

function templateStatusLabel(status: string) {
  return status === "approved" ? "Aprobada" : status === "pending_approval" ? "Por aprobar" : status === "draft" ? "Borrador" : "Archivada";
}
