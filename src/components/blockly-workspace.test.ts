/**
 * Tests for blockly-workspace serialization/deserialization (Task 7)
 * Requirements: 6.1, 6.2, 6.4
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fc from "fast-check";

// Use Blockly's node-compatible core (no DOM required)
import * as Blockly from "blockly/core";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Register the temi_move block with a given set of locations (headless). */
function registerTemiMoveBlock(locations: string[]) {
  const dropdownOptions: [string, string][] =
    locations.length > 0
      ? locations.map((l) => [l, l])
      : [["Sala Principal", "Sala Principal"]];

  // Re-register each time (delete first to allow re-definition in tests)
  if (Blockly.Blocks["temi_move"]) {
    delete Blockly.Blocks["temi_move"];
  }

  Blockly.common.defineBlocksWithJsonArray([
    {
      type: "temi_move",
      message0: "ir a %1",
      args0: [{ type: "field_dropdown", name: "LOCATION", options: dropdownOptions }],
      previousStatement: null,
      nextStatement: null,
      colour: 215,
      tooltip: "Mueve a Temi hacia adelante",
      helpUrl: ""
    }
  ]);
}

/** Create a headless Blockly workspace. */
function createHeadlessWorkspace(): Blockly.Workspace {
  return new Blockly.Workspace();
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

let workspace: Blockly.Workspace;

beforeEach(() => {
  registerTemiMoveBlock(["Sala Principal", "Biblioteca", "Laboratorio"]);
  workspace = createHeadlessWorkspace();
});

afterEach(() => {
  workspace.dispose();
});

// ---------------------------------------------------------------------------
// Unit test 7.2 — Requirement 6.4
// ---------------------------------------------------------------------------

describe("Workspace con formato antiguo (STEPS)", () => {
  /**
   * R6.4: IF se carga un workspace serializado con el formato antiguo (campo STEPS),
   * THEN el Blockly_Workspace SHALL ignorar el bloque incompatible sin lanzar excepción.
   *
   * This mirrors the try/catch in loadBlockly in blockly-workspace.tsx.
   */
  it("no lanza excepción al cargar un JSON con fields.STEPS (formato antiguo)", () => {
    const oldFormatState = {
      blocks: {
        languageVersion: 0,
        blocks: [
          {
            type: "temi_move",
            id: "block1",
            x: 10,
            y: 10,
            fields: { STEPS: 2 }
          }
        ]
      }
    };

    // Replicate the try/catch from loadBlockly
    let threw = false;
    try {
      Blockly.serialization.workspaces.load(oldFormatState, workspace);
    } catch {
      threw = true;
    }

    expect(threw).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Property test P5 — Requirements 6.1, 6.2, 6.3
// ---------------------------------------------------------------------------

/**
 * Property 5: Round-trip de serialización del workspace preserva LOCATION
 *
 * For any valid location name selected in the Location_Dropdown,
 * save() → load() SHALL produce a temi_move block with the same LOCATION value.
 *
 * Validates: Requirements 6.1, 6.2, 6.3
 */
describe("P5: Round-trip de serialización preserva LOCATION", () => {
  it("save() → load() preserva el valor del campo LOCATION para cualquier nombre de ubicación", () => {
    fc.assert(
      fc.property(
        // Generate non-empty location name strings (printable ASCII, no quotes to keep JSON valid)
        fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
        (locationName) => {
          // Register block with this specific location
          registerTemiMoveBlock([locationName]);

          const ws1 = createHeadlessWorkspace();
          try {
            // Build a workspace state with temi_move selecting locationName
            const stateToLoad = {
              blocks: {
                languageVersion: 0,
                blocks: [
                  {
                    type: "temi_move",
                    id: "roundtrip_block",
                    x: 0,
                    y: 0,
                    fields: { LOCATION: locationName }
                  }
                ]
              }
            };

            // Load the state
            Blockly.serialization.workspaces.load(stateToLoad, ws1);

            // Save it back
            const saved = Blockly.serialization.workspaces.save(ws1);

            // Extract the LOCATION field from the saved state
            const savedBlocks = (saved as { blocks?: { blocks?: Array<{ type: string; fields?: Record<string, unknown> }> } }).blocks?.blocks ?? [];
            const savedBlock = savedBlocks.find((b) => b.type === "temi_move");

            // The saved block must exist and preserve the LOCATION value
            return savedBlock !== undefined && savedBlock.fields?.["LOCATION"] === locationName;
          } finally {
            ws1.dispose();
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
