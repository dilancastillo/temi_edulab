"use client";

import { useState } from "react";
import {
  extractLocationFromWorkspace,
  executeRobotCommands,
} from "@/lib/robot-adapter";

interface ExecuteButtonProps {
  workspaceState: unknown;
  sequence: string[];
  disabled?: boolean;
}

export function ExecuteButton({ workspaceState, sequence, disabled }: ExecuteButtonProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  const hasTemiMove = sequence.includes("temi_move");
  const isDisabled = disabled || !hasTemiMove || loading;

  async function handleClick() {
    setMessage(null);
    setLoading(true);
    try {
      const location = extractLocationFromWorkspace(workspaceState);
      if (!location) {
        setMessage({ text: "El bloque 'ir a' no tiene ubicación seleccionada", ok: false });
        return;
      }
      const result = await executeRobotCommands([{ type: "Navigate", location }]);
      setMessage({ text: result.message, ok: result.ok });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        className="button button-primary"
        onClick={handleClick}
        disabled={isDisabled}
        aria-busy={loading}
      >
        {loading ? "Ejecutando..." : "Ejecutar en robot"}
      </button>
      {message && (
        <p
          className={message.ok ? "success-message" : "form-error"}
          aria-live="polite"
          style={{ marginTop: "0.75rem" }}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}
