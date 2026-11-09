"use client";

import { useEffect, useRef, useState } from "react";
import {
  cancelRobotExecution,
  extractCommandsFromWorkspace,
  executeRobotCommands,
} from "@/lib/robot-adapter";

const STORAGE_KEY = "esbot.robotExecuting.v1";

interface ExecuteButtonProps {
  workspaceState: unknown;
  sequence: string[];
  disabled?: boolean;
  label?: string;
  inline?: boolean;
  /** Unique key to identify this execution context (e.g. assignmentId) */
  executionKey?: string;
}

export function ExecuteButton({ workspaceState, sequence, disabled, label = "Ejecutar en robot", inline = false, executionKey }: ExecuteButtonProps) {
  const [loading, setLoading] = useState(() => {
    // Restore execution state from localStorage on mount
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as { key?: string };
        // If no executionKey or keys match, restore loading state
        if (!executionKey || parsed.key === executionKey) return true;
      }
    } catch { /* ignore */ }
    return false;
  });
  const [canceling, setCanceling] = useState(false);
  // La página dejó de esperar al robot (tiempo agotado, red o robot ocupado), pero el robot
  // puede seguir con el programa: se deja visible el botón para detenerlo.
  const [robotMaybeRunning, setRobotMaybeRunning] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const executionRef = useRef({ id: 0, canceled: false });

  // Persist loading state to localStorage
  useEffect(() => {
    try {
      if (loading || robotMaybeRunning) {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ key: executionKey ?? null }));
      } else {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    } catch { /* ignore */ }
  }, [loading, robotMaybeRunning, executionKey]);

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
    setRobotMaybeRunning(false);

    try {
      const result = await executeRobotCommands(commands);
      if (executionRef.current.id !== executionId || executionRef.current.canceled) return;
      setMessage({ text: result.message, ok: result.ok });
      setRobotMaybeRunning(result.maybeRunning === true);
    } finally {
      if (executionRef.current.id === executionId) {
        setLoading(false);
        setCanceling(false);
      }
    }
  }

  async function handlePause() {
    if ((!loading && !robotMaybeRunning) || canceling) return;

    executionRef.current.canceled = true;
    setCanceling(true);
    setMessage(null);

    try {
      const result = await cancelRobotExecution();
      // "No hay ejecución activa" también confirma que el robot ya está libre.
      const robotIdle = result.ok || result.message === "No hay ejecución activa";
      setMessage({ text: result.ok || !robotIdle ? result.message : "El robot ya había terminado", ok: robotIdle });
      if (robotIdle) {
        setLoading(false);
        setRobotMaybeRunning(false);
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
      {(loading || robotMaybeRunning) && !canceling ? (
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
