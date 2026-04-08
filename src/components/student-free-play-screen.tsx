"use client";

import { useState } from "react";
import { BlocklyWorkspace } from "@/components/blockly-workspace";
import { evaluateOrderSteps } from "@/lib/mission-program";

export function StudentFreePlayScreen() {
  const [sequence, setSequence] = useState<string[]>([]);
  const evaluation = evaluateOrderSteps(sequence);

  return (
    <div className="student-page-stack">
      <section className="editor-header-card">
        <p className="eyebrow">Juego libre</p>
        <h1>Prueba bloques sin enviar</h1>
        <p>Este espacio no afecta tu progreso. Úsalo para experimentar antes de entrar a una misión.</p>
      </section>
      <BlocklyWorkspace
        initialState={undefined}
        onChange={({ sequence: nextSequence }) => setSequence(nextSequence)}
        readOnly={false}
      />
      <p className="success-message" aria-live="polite">
        {evaluation.message}
      </p>
    </div>
  );
}

