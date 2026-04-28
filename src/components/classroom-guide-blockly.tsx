"use client";

import type * as BlocklyType from "blockly";
import { useEffect, useMemo, useRef, useState } from "react";
import type {
  ClassroomGuideAdvancedDraft,
  ClassroomGuideBlockType,
  ClassroomGuideLocationOption
} from "@/lib/classroom-guide-mission";

type WorkspaceChange = {
  workspaceState: unknown;
  sequence: ClassroomGuideBlockType[];
  draft: ClassroomGuideAdvancedDraft;
};

type Props = {
  initialState?: unknown;
  locationOptions: ClassroomGuideLocationOption[];
  readOnly?: boolean;
  onChange: (change: WorkspaceChange) => void;
};

const paletteButtons = [
  { type: "guide_greeting" as const, label: "Saludar", className: "classroom-block-button-guide_greeting" },
  { type: "guide_go_to" as const, label: "Ir a un lugar", className: "classroom-block-button-guide_go_to" },
  { type: "guide_explain" as const, label: "Explicar lugar", className: "classroom-block-button-guide_explain" },
  { type: "guide_farewell" as const, label: "Despedirse", className: "classroom-block-button-guide_farewell" },
  { type: "guide_return_base" as const, label: "Volver al punto base", className: "classroom-block-button-guide_return_base" }
] as const;

function defineGuideBlocks(Blockly: typeof BlocklyType, locationOptions: ClassroomGuideLocationOption[]) {
  const dropdownOptions = locationOptions.map((option) => [option.alias, option.locationName] as [string, string]);
  const safeOptions: [string, string][] = dropdownOptions.length > 0 ? dropdownOptions : [["Lugar 1", ""]];

  Blockly.Blocks.guide_start = {
    init() {
      this.appendDummyInput().appendField("iniciar mision");
      this.setColour(215);
      this.setNextStatement(true);
      this.setTooltip("");
      this.setHelpUrl("");
    }
  };

  Blockly.Blocks.guide_greeting = {
    init() {
      this.appendDummyInput()
        .appendField("saludar diciendo")
        .appendField(new Blockly.FieldTextInput(""), "TEXT");
      this.setColour(285);
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setTooltip("");
      this.setHelpUrl("");
    }
  };

  Blockly.Blocks.guide_go_to = {
    init() {
      this.appendDummyInput()
        .appendField("ir a")
        .appendField(new Blockly.FieldDropdown(safeOptions), "LOCATION");
      this.setColour(35);
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setTooltip("");
      this.setHelpUrl("");
    }
  };

  Blockly.Blocks.guide_explain = {
    init() {
      this.appendDummyInput()
        .appendField("explicar")
        .appendField(new Blockly.FieldTextInput(""), "TEXT");
      this.setColour(110);
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setTooltip("");
      this.setHelpUrl("");
    }
  };

  Blockly.Blocks.guide_farewell = {
    init() {
      this.appendDummyInput()
        .appendField("despedirse diciendo")
        .appendField(new Blockly.FieldTextInput(""), "TEXT");
      this.setColour(285);
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setTooltip("");
      this.setHelpUrl("");
    }
  };

  Blockly.Blocks.guide_return_base = {
    init() {
      this.appendDummyInput().appendField("volver al punto base");
      this.setColour(35);
      this.setPreviousStatement(true);
      this.setNextStatement(false);
      this.setTooltip("");
      this.setHelpUrl("");
    }
  };
}

function seedWorkspace(Blockly: typeof BlocklyType, workspace: BlocklyType.WorkspaceSvg) {
  const startBlock = workspace.newBlock("guide_start");
  startBlock.initSvg();
  startBlock.render();
  startBlock.setDeletable(false);
  startBlock.setMovable(false);
  startBlock.moveBy(48, 48);
}

function getTopSequence(workspace: BlocklyType.WorkspaceSvg) {
  const topBlocks = workspace.getTopBlocks(true);
  const firstBlock = topBlocks.find((block) => block.type === "guide_start") ?? topBlocks[0];
  const blocks: BlocklyType.Block[] = [];
  let currentBlock: BlocklyType.Block | null | undefined = firstBlock;

  while (currentBlock) {
    blocks.push(currentBlock);
    currentBlock = currentBlock.getNextBlock();
  }

  return blocks;
}

function collectSequence(workspace: BlocklyType.WorkspaceSvg) {
  return getTopSequence(workspace).map((block) => block.type as ClassroomGuideBlockType);
}

function extractDraft(
  workspace: BlocklyType.WorkspaceSvg,
  locationOptions: ClassroomGuideLocationOption[]
): ClassroomGuideAdvancedDraft {
  const blocks = getTopSequence(workspace);
  const stops: ClassroomGuideAdvancedDraft["stops"] = [];
  let greetingText = "";
  let farewellText = "";

  for (const block of blocks) {
    if (block.type === "guide_greeting") {
      greetingText = String(block.getFieldValue("TEXT") ?? "");
      continue;
    }

    if (block.type === "guide_go_to") {
      const locationName = String(block.getFieldValue("LOCATION") ?? "");
      const normalizedLocation = normalize(locationName);
      const option = locationOptions.find(
        (item) => normalize(item.locationName) === normalizedLocation || normalize(item.alias) === normalizedLocation
      );
      stops.push({
        locationName: option?.locationName ?? locationName,
        alias: option?.alias ?? locationName,
        iconKey: option?.iconKey ?? "star",
        messageText: ""
      });
      continue;
    }

    if (block.type === "guide_explain") {
      const lastStop = stops[stops.length - 1];
      if (lastStop) {
        lastStop.messageText = String(block.getFieldValue("TEXT") ?? "");
      }
      continue;
    }

    if (block.type === "guide_farewell") {
      farewellText = String(block.getFieldValue("TEXT") ?? "");
    }
  }

  return {
    greetingText,
    farewellText,
    stops
  };
}

function normalize(value: string | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function getStartBlock(workspace: BlocklyType.WorkspaceSvg) {
  return workspace.getTopBlocks(true).find((block) => block.type === "guide_start") ?? null;
}

function getLastBlock(workspace: BlocklyType.WorkspaceSvg) {
  const startBlock = getStartBlock(workspace);
  if (!startBlock) {
    return null;
  }

  let currentBlock: BlocklyType.Block | null = startBlock;
  while (currentBlock?.getNextBlock()) {
    currentBlock = currentBlock.getNextBlock();
  }

  return currentBlock;
}

function appendBlockToSequence(
  Blockly: typeof BlocklyType,
  workspace: BlocklyType.WorkspaceSvg,
  type: ClassroomGuideBlockType
) {
  const lastBlock = getLastBlock(workspace);
  if (!lastBlock || type === "guide_start") {
    return;
  }

  const newBlock = workspace.newBlock(type);
  newBlock.initSvg();
  newBlock.render();

  if (lastBlock.nextConnection && newBlock.previousConnection) {
    lastBlock.nextConnection.connect(newBlock.previousConnection);
  } else {
    newBlock.moveBy(48, 120);
  }

  Blockly.svgResize(workspace);
}

function removeLastBlock(workspace: BlocklyType.WorkspaceSvg) {
  const lastBlock = getLastBlock(workspace);
  if (!lastBlock || lastBlock.type === "guide_start") {
    return;
  }

  lastBlock.dispose(true);
}

function resetToStart(workspace: BlocklyType.WorkspaceSvg) {
  workspace.getAllBlocks(false).forEach((block) => {
    if (block.type !== "guide_start") {
      block.dispose(true);
    }
  });
}

export function ClassroomGuideBlockly({ initialState, locationOptions, onChange, readOnly = false }: Readonly<Props>) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const workspaceRef = useRef<BlocklyType.WorkspaceSvg | null>(null);
  const blocklyRef = useRef<typeof BlocklyType | null>(null);
  const onChangeRef = useRef(onChange);
  const initialStateRef = useRef(initialState);
  const [isLoading, setIsLoading] = useState(true);
  const [sequence, setSequence] = useState<ClassroomGuideBlockType[]>([]);

  const locationOptionsRef = useRef(locationOptions);
  const palette = useMemo(() => paletteButtons, []);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    locationOptionsRef.current = locationOptions;
  }, [locationOptions]);

  useEffect(() => {
    let active = true;

    async function loadBlockly() {
      const Blockly = await import("blockly");
      if (!active || !containerRef.current) {
        return;
      }

      defineGuideBlocks(Blockly, locationOptionsRef.current);
      blocklyRef.current = Blockly;

      const workspace = Blockly.inject(containerRef.current, {
        readOnly,
        trashcan: !readOnly,
        renderer: "zelos",
        grid: { spacing: 24, length: 3, colour: "#d9e3ee", snap: true },
        zoom: { controls: true, wheel: true, startScale: 0.92, maxScale: 1.25, minScale: 0.7 },
        move: { scrollbars: true, drag: true, wheel: true }
      });

      workspaceRef.current = workspace;

      if (initialStateRef.current && typeof initialStateRef.current === "object") {
        try {
          Blockly.serialization.workspaces.load(initialStateRef.current, workspace);
        } catch {
          // Ignore old or incompatible states.
        }
      }

      if (workspace.getAllBlocks(false).length === 0) {
        seedWorkspace(Blockly, workspace);
      }

      const startBlock = getStartBlock(workspace);
      startBlock?.setDeletable(false);
      startBlock?.setMovable(false);

      const emitChange = () => {
        const nextSequence = collectSequence(workspace);
        setSequence(nextSequence);
        onChangeRef.current({
          workspaceState: Blockly.serialization.workspaces.save(workspace),
          sequence: nextSequence,
          draft: extractDraft(workspace, locationOptionsRef.current)
        });
      };

      workspace.addChangeListener((event) => {
        if (event.isUiEvent) {
          return;
        }
        emitChange();
      });

      emitChange();
      Blockly.svgResize(workspace);
      setIsLoading(false);
    }

    void loadBlockly();

    return () => {
      active = false;
      workspaceRef.current?.dispose();
      workspaceRef.current = null;
      blocklyRef.current = null;
    };
  }, [readOnly]);

  return (
    <div className="classroom-blockly-shell">
      <div className="classroom-blockly-palette">
        <div className="classroom-blockly-palette-header">
          <strong>Bloques</strong>
          <span>Agrega uno por uno</span>
        </div>

        <div className="classroom-blockly-palette-list">
          {palette.map((block) => (
            <button
              className={`classroom-block-button ${block.className}`}
              disabled={readOnly || isLoading}
              key={block.type}
              onClick={() => {
                if (!workspaceRef.current || !blocklyRef.current) {
                  return;
                }
                appendBlockToSequence(blocklyRef.current, workspaceRef.current, block.type);
              }}
              type="button"
            >
              {block.label}
            </button>
          ))}
        </div>

        <div className="classroom-blockly-controls">
          <button
            className="button button-secondary"
            disabled={readOnly || isLoading || sequence.length <= 1}
            onClick={() => {
              if (!workspaceRef.current) {
                return;
              }
              removeLastBlock(workspaceRef.current);
            }}
            type="button"
          >
            Deshacer ultimo
          </button>
          <button
            className="button button-secondary"
            disabled={readOnly || isLoading || sequence.length <= 1}
            onClick={() => {
              if (!workspaceRef.current) {
                return;
              }
              resetToStart(workspaceRef.current);
            }}
            type="button"
          >
            Empezar de nuevo
          </button>
        </div>
      </div>

      <div className="blockly-card blockly-card-compact">
        {isLoading ? <p className="blockly-loading">Cargando bloques...</p> : null}
        <div className="blockly-canvas" ref={containerRef} />
      </div>
    </div>
  );
}
