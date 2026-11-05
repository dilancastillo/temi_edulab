"use client";

import { useMemo, useState } from "react";
import { BlocklyWorkspace } from "@/components/blockly-workspace";
import { BLOCK_DEFAULTS, blockName, buildMissionSteps, extractProgram, type StepTexts } from "@/lib/mission-steps";
import type { MissionStep } from "@/lib/types";

type MissionSolutionEditorProps = {
  initialWorkspace: unknown;
  initialTexts: StepTexts;
  onCancel: () => void;
  onSave: (result: { solutionWorkspace: unknown; steps: MissionStep[] }) => void;
};

/**
 * El docente arma con bloques la solución correcta de la misión. Cada bloque conectado a
 * "cuando inicia" es un paso, en ese orden y posición; a la izquierda se escriben la
 * etiqueta y la instrucción que verá el estudiante para cada paso.
 */
export function MissionSolutionEditor({ initialWorkspace, initialTexts, onCancel, onSave }: Readonly<MissionSolutionEditorProps>) {
  // Estado inicial fijo: el editor de bloques no se recarga mientras el docente trabaja.
  const [initial] = useState(() => initialWorkspace);
  const [workspaceState, setWorkspaceState] = useState<unknown>(initialWorkspace);
  const [texts, setTexts] = useState<StepTexts>(initialTexts);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const nodes = useMemo(() => extractProgram(workspaceState), [workspaceState]);
  const selectedIndex = nodes.findIndex((node) => node.blockId === selectedId);

  const problem =
    nodes.length === 0
      ? "Arma la solución: empieza con el bloque \"cuando inicia\" y conecta debajo los demás."
      : nodes[0].type !== "temi_start"
        ? "La solución debe empezar con el bloque \"cuando inicia\"."
        : nodes.length === 1
          ? "Agrega al menos un bloque debajo de \"cuando inicia\"."
          : "";

  function updateText(blockId: string, field: "label" | "helper", value: string) {
    setTexts((current) => ({ ...current, [blockId]: { ...current[blockId], [field]: value } }));
  }

  function handleSave() {
    if (problem) return;
    onSave({ solutionWorkspace: workspaceState, steps: buildMissionSteps(nodes, texts) });
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section aria-labelledby="solution-editor-title" aria-modal="true" className="solution-editor" role="dialog">
        <header className="solution-editor-header">
          <div>
            <p className="eyebrow">Pasos del programa</p>
            <h2 id="solution-editor-title">Arma la solución correcta</h2>
            <p className="muted">
              Cada bloque es un paso. El estudiante debe armarlos en el mismo orden y en la misma posición para que cada
              paso se ponga en verde. Haz clic en un bloque o en un paso para escribir lo que verá el estudiante.
            </p>
          </div>
          <div className="modal-actions" style={{ flexShrink: 0 }}>
            <button className="button button-ghost" onClick={onCancel} type="button">
              Cancelar
            </button>
            <button className="button button-primary" disabled={Boolean(problem)} onClick={handleSave} type="button">
              Usar estos pasos
            </button>
          </div>
        </header>

        <div className="solution-editor-body">
          <aside aria-label="Pasos" className="solution-steps">
            {problem ? <p className="hint-card">{problem}</p> : null}
            <ol className="solution-step-list">
              {nodes.map((node, index) => {
                const isSelected = node.blockId === selectedId;
                const defaults = BLOCK_DEFAULTS[node.type];
                const text = texts[node.blockId];
                return (
                  <li key={node.blockId} style={{ marginLeft: `${node.depth * 1.25}rem` }}>
                    <button
                      aria-current={isSelected ? "true" : undefined}
                      className="solution-step-button"
                      onClick={() => setSelectedId(node.blockId)}
                      type="button"
                    >
                      <span className="solution-step-number">{index + 1}</span>
                      <span>
                        <strong>{text?.label?.trim() || defaults.label}</strong>
                        <small>{blockName(node.type)}{node.parentType ? ` · dentro de "${blockName(node.parentType)}"` : ""}</small>
                      </span>
                    </button>
                    {isSelected ? (
                      <div className="solution-step-fields">
                        <label className="field" htmlFor={`step-label-${node.blockId}`}>
                          Etiqueta
                          <input
                            id={`step-label-${node.blockId}`}
                            maxLength={80}
                            onChange={(event) => updateText(node.blockId, "label", event.target.value)}
                            placeholder={defaults.label}
                            type="text"
                            value={text?.label ?? ""}
                          />
                        </label>
                        <label className="field" htmlFor={`step-helper-${node.blockId}`}>
                          Instrucción
                          <textarea
                            id={`step-helper-${node.blockId}`}
                            maxLength={240}
                            onChange={(event) => updateText(node.blockId, "helper", event.target.value)}
                            placeholder={defaults.helper}
                            rows={3}
                            value={text?.helper ?? ""}
                          />
                        </label>
                        <small className="muted">Si lo dejas vacío, el estudiante verá el texto gris de ejemplo.</small>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ol>
            {selectedId && selectedIndex === -1 ? (
              <p className="hint-card">
                Ese bloque no está conectado debajo de &ldquo;cuando inicia&rdquo;, así que no cuenta como paso.
              </p>
            ) : null}
          </aside>

          <BlocklyWorkspace
            initialState={initial}
            // Blockly deselecciona el bloque cuando el foco sale del editor (por ejemplo, al hacer
            // clic en Etiqueta para escribir). Solo se cambia de paso al elegir otro bloque.
            onBlockSelected={(blockId) => {
              if (blockId) setSelectedId(blockId);
            }}
            onChange={({ workspaceState: next }) => setWorkspaceState(next)}
            readOnly={false}
            selectedBlockId={selectedId}
          />
        </div>
      </section>
    </div>
  );
}
