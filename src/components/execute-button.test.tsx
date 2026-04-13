import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ExecuteButton } from "./execute-button";

// Mock del módulo robot-adapter
vi.mock("@/lib/robot-adapter", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/robot-adapter")>();
  return {
    ...actual,
    executeRobotCommands: vi.fn(),
  };
});

import { executeRobotCommands } from "@/lib/robot-adapter";

const mockExecute = vi.mocked(executeRobotCommands);

// Workspace con bloque temi_move
const workspaceWithTemiMove = {
  blocks: {
    blocks: [
      { type: "temi_move", fields: { LOCATION: "Sala Principal" } },
    ],
  },
};

const workspaceEmpty = {
  blocks: { blocks: [] },
};

describe("ExecuteButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("está deshabilitado cuando sequence no contiene 'temi_move'", () => {
    render(
      <ExecuteButton
        workspaceState={workspaceEmpty}
        sequence={["temi_start"]}
      />
    );
    const button = screen.getByRole("button", { name: /ejecutar en robot/i });
    expect(button).toBeDisabled();
  });

  it("está habilitado cuando sequence contiene 'temi_move'", () => {
    mockExecute.mockResolvedValue({ ok: true, message: "Navigate dispatched" });

    render(
      <ExecuteButton
        workspaceState={workspaceWithTemiMove}
        sequence={["temi_start", "temi_move"]}
      />
    );
    const button = screen.getByRole("button", { name: /ejecutar en robot/i });
    expect(button).not.toBeDisabled();
  });

  it("muestra feedback de éxito cuando executeRobotCommands devuelve ok:true", async () => {
    mockExecute.mockResolvedValue({ ok: true, message: "Navigate dispatched" });

    render(
      <ExecuteButton
        workspaceState={workspaceWithTemiMove}
        sequence={["temi_start", "temi_move"]}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /ejecutar en robot/i }));

    await waitFor(() => {
      expect(screen.getByText("Navigate dispatched")).toBeInTheDocument();
    });

    // El mensaje de éxito usa la clase success-message
    const msg = screen.getByText("Navigate dispatched");
    expect(msg).toHaveClass("success-message");
  });

  it("muestra feedback de error cuando executeRobotCommands devuelve ok:false", async () => {
    mockExecute.mockResolvedValue({ ok: false, message: "Robot no disponible" });

    render(
      <ExecuteButton
        workspaceState={workspaceWithTemiMove}
        sequence={["temi_start", "temi_move"]}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /ejecutar en robot/i }));

    await waitFor(() => {
      expect(screen.getByText("Robot no disponible")).toBeInTheDocument();
    });

    // El mensaje de error usa la clase form-error
    const msg = screen.getByText("Robot no disponible");
    expect(msg).toHaveClass("form-error");
  });

  it("muestra 'Ejecutando...' mientras espera la respuesta", async () => {
    // Promesa que no resuelve inmediatamente
    let resolve!: (v: { ok: boolean; message: string }) => void;
    mockExecute.mockReturnValue(new Promise((r) => { resolve = r; }));

    render(
      <ExecuteButton
        workspaceState={workspaceWithTemiMove}
        sequence={["temi_start", "temi_move"]}
      />
    );

    fireEvent.click(screen.getByRole("button"));

    expect(screen.getByRole("button")).toHaveTextContent("Ejecutando...");
    expect(screen.getByRole("button")).toBeDisabled();

    // Resolver para limpiar
    resolve({ ok: true, message: "OK" });
    await waitFor(() => {
      expect(screen.getByRole("button")).toHaveTextContent("Ejecutar en robot");
    });
  });

  it("el botón vuelve a su estado normal tras recibir la respuesta", async () => {
    mockExecute.mockResolvedValue({ ok: true, message: "OK" });

    render(
      <ExecuteButton
        workspaceState={workspaceWithTemiMove}
        sequence={["temi_start", "temi_move"]}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /ejecutar en robot/i }));

    await waitFor(() => {
      expect(screen.getByRole("button")).toHaveTextContent("Ejecutar en robot");
      expect(screen.getByRole("button")).not.toBeDisabled();
    });
  });
});
