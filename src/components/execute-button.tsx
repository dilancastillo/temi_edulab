"use client";

import { useRef, useState } from "react";
import {
  cancelRobotExecution,
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
  const [canceling, setCanceling] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const executionRef = useRef({ id: 0, canceled: false });

  const hasExecutableCommand = extractCommandsFromWorkspace(workspaceState).length > 0;
  const isDisabled = disabled || !hasExecutableCommand || loading || canceling;

  async function handleClick() {
    setMessage(null);

    const commands = extractCommandsFromWorkspace(workspaceState);
    if (commands.length === 0) {
      setMessage({ text: "No hay bloques ejecutables en el programa", ok: false });
      return;
    }

    const executionId = executionRef.current.id + 1;
    executionRef.current = { id: executionId, canceled: false };
    setLoading(true);
    setCanceling(false);

    try {
      const result = await executeRobotCommands(commands);
      if (executionRef.current.id !== executionId || executionRef.current.canceled) return;
      setMessage({ text: result.message, ok: result.ok });
    } finally {
      if (executionRef.current.id === executionId) {
        setLoading(false);
        setCanceling(false);
      }
    }
  }

  async function handlePause() {
    if (!loading || canceling) return;

    executionRef.current.canceled = true;
    setCanceling(true);
    setMessage(null);

    try {
      const result = await cancelRobotExecution();
      setMessage({ text: result.message, ok: result.ok });
      if (result.ok) {
        setLoading(false);
      }
    } finally {
      setCanceling(false);
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
      {loading && !canceling ? (
        <button
          className="button button-secondary"
          onClick={handlePause}
          disabled={canceling}
          type="button"
        >
          Pausar
        </button>
      ) : null}
      {canceling ? (
        <button className="button button-secondary" disabled type="button">
          Cancelando...
        </button>
      ) : null}
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
