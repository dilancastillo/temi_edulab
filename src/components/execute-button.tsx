"use client";

import { useState } from "react";
import {
  extractCommandsFromWorkspace,
  executeRobotCommands,
} from "@/lib/robot-adapter";

interface ExecuteButtonProps {
  workspaceState: unknown;
  sequence: string[];
  disabled?: boolean;
  label?: string;
  inline?: boolean;
}

export function ExecuteButton({ workspaceState, sequence, disabled, label = "Ejecutar en robot", inline = false }: ExecuteButtonProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  const hasExecutableBlock = sequence.includes("temi_move") || sequence.includes("temi_say");
  const isDisabled = disabled || !hasExecutableBlock || loading;

  async function handleClick() {
    setMessage(null);
    setLoading(true);
    try {
      const commands = extractCommandsFromWorkspace(workspaceState);
      if (commands.length === 0) {
        setMessage({ text: "No hay bloques ejecutables en el programa", ok: false });
        return;
      }
      const result = await executeRobotCommands(commands);
      setMessage({ text: result.message, ok: result.ok });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={inline ? { display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "nowrap" } : undefined}>
      <button
        className="button button-primary"
        onClick={handleClick}
        disabled={isDisabled}
        aria-busy={loading}
      >
        {loading ? "Ejecutando..." : label}
      </button>
      {message && (
        <span
          className={message.ok ? "success-message" : "form-error"}
          aria-live="polite"
          style={inline ? { margin: 0, whiteSpace: "nowrap" } : { display: "block", marginTop: "0.75rem" }}
        >
          {message.text}
        </span>
      )}
    </div>
  );
}
