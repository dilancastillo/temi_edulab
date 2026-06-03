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
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const executionRef = useRef({ id: 0, canceled: false });

  // Persist loading state to localStorage
  useEffect(() => {
    try {
      if (loading) {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ key: executionKey ?? null }));
      } else {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    } catch { /* ignore */ }
  }, [loading, executionKey]);

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
