"use client";

import type * as BlocklyType from "blockly";
import { useEffect, useRef, useState } from "react";

type WorkspaceChange = {
  workspaceState: unknown;
  sequence: string[];
};

type BlocklyWorkspaceProps = {
  initialState?: unknown;
  readOnly?: boolean;
  allowedCategories?: string[];
  onChange: (change: WorkspaceChange) => void;
  onWorkspaceReady?: (updateImageBase64ById: (blockId: string, base64: string) => void) => void;
};

const toolbox = {
  kind: "categoryToolbox",
  contents: [
    {
      kind: "category",
      name: "Movimiento",
      colour: "#2856a6",
      contents: [
        { kind: "block", type: "temi_start" },
        { kind: "block", type: "temi_move" }
      ]
    },
    {
      kind: "category",
      name: "Hablar",
      colour: "#8945c8",
      contents: [{ kind: "block", type: "temi_say" }]
    },
    {
      kind: "category",
      name: "Mostrar",
      colour: "#c8891f",
      contents: [
        { kind: "block", type: "temi_show" },
        { kind: "block", type: "temi_show_image" }
      ]
    },
    {
      kind: "category",
      name: "Audio",
      colour: "#1f8f4d",
      contents: [{ kind: "block", type: "temi_audio" }]
    }
  ]
};

function defineTemiBlocks(Blockly: typeof BlocklyType, locations: string[]) {
  if (Blockly.Blocks.temi_start) return;

  const dropdownOptions: [string, string][] =
    locations.length > 0 ? locations.map((l) => [l, l]) : [["Sala Principal", "Sala Principal"]];

  Blockly.common.defineBlocksWithJsonArray([
    {
      type: "temi_start",
      message0: "cuando inicia",
      nextStatement: null,
      colour: 215,
      tooltip: "Inicio del programa",
      helpUrl: ""
    },
    {
      type: "temi_move",
      message0: "ir a %1",
      args0: [{ type: "field_dropdown", name: "LOCATION", options: dropdownOptions }],
      previousStatement: null,
      nextStatement: null,
      colour: 215,
      tooltip: "Mueve a Temi hacia adelante",
      helpUrl: ""
    },
    {
      type: "temi_say",
      message0: "decir %1",
      args0: [{ type: "field_input", name: "TEXT", text: "Hola, llegué a la meta" }],
      previousStatement: null,
      nextStatement: null,
      colour: 285,
      tooltip: "Temi dice un texto",
      helpUrl: ""
    },
    {
      type: "temi_show",
      message0: "mostrar señal %1",
      args0: [
        {
          type: "field_dropdown",
          name: "SIGNAL",
          options: [
            ["Meta", "goal"],
            ["Alerta", "alert"],
            ["Listo", "ready"]
          ]
        }
      ],
      previousStatement: null,
      nextStatement: null,
      colour: 40,
      tooltip: "Muestra una señal en la pantalla",
      helpUrl: ""
    },
    {
      type: "temi_show_image",
      message0: "mostrar imagen 🖼",
      previousStatement: null,
      nextStatement: null,
      colour: 40,
      tooltip: "Muestra una imagen en pantalla completa durante 7 segundos",
      helpUrl: ""
    },
    {
      type: "temi_audio",
      message0: "reproducir audio %1",
      args0: [
        {
          type: "field_dropdown",
          name: "AUDIO",
          options: [
            ["Confirmación", "confirm"],
            ["Campana", "bell"],
            ["Aplausos", "clap"]
          ]
        }
      ],
      previousStatement: null,
      nextStatement: null,
      colour: 140,
      tooltip: "Reproduce una confirmación sonora",
      helpUrl: ""
    }
  ]);

  // Add hidden IMAGE_BASE64 field and visible LABEL field to temi_show_image block
  Blockly.Blocks["temi_show_image"].init = function (this: BlocklyType.Block) {
    this.appendDummyInput()
      .appendField("mostrar imagen")
      .appendField(new Blockly.FieldLabel("(sin imagen)"), "LABEL");
    this.appendDummyInput("IMAGE_FIELD")
      .appendField(new Blockly.FieldTextInput(""), "IMAGE_BASE64")
      .setVisible(false);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(40);
    this.setTooltip("Muestra una imagen en pantalla completa durante 7 segundos");
  };
}

function collectSequence(workspace: BlocklyType.WorkspaceSvg) {
  const topBlocks = workspace.getTopBlocks(true);
  const firstBlock = topBlocks.find((block) => block.type === "temi_start") ?? topBlocks[0];
  const sequence: string[] = [];
  let currentBlock: BlocklyType.Block | null | undefined = firstBlock;

  while (currentBlock) {
    sequence.push(currentBlock.type);
    currentBlock = currentBlock.getNextBlock();
  }

  return sequence;
}

export function BlocklyWorkspace({ initialState, onChange, readOnly = false, allowedCategories, onWorkspaceReady }: Readonly<BlocklyWorkspaceProps>) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const workspaceRef = useRef<BlocklyType.WorkspaceSvg | null>(null);
  const blocklyRef = useRef<typeof BlocklyType | null>(null);
  const onChangeRef = useRef(onChange);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    let isMounted = true;

    async function loadBlockly() {
      const Blockly = await import("blockly");
      if (!isMounted || !containerRef.current) return;

      const { fetchRobotLocations } = await import("@/lib/robot-adapter");
      const locations = await fetchRobotLocations();

      defineTemiBlocks(Blockly, locations);
      blocklyRef.current = Blockly;

      const filteredToolbox = allowedCategories
        ? { ...toolbox, contents: toolbox.contents.filter((c) => allowedCategories.includes(c.name)) }
        : toolbox;

      const workspace = Blockly.inject(containerRef.current, {
        toolbox: filteredToolbox,
        readOnly,
        trashcan: !readOnly,
        renderer: "zelos",
        grid: { spacing: 24, length: 3, colour: "#d9e3ee", snap: true },
        zoom: { controls: true, wheel: true, startScale: 0.9, maxScale: 1.4, minScale: 0.5 },
        move: { scrollbars: true, drag: true, wheel: true }
      });

      workspaceRef.current = workspace;

      if (initialState && typeof initialState === "object") {
        try {
          Blockly.serialization.workspaces.load(initialState, workspace);
        } catch {
          // Ignore incompatible old demo workspaces.
        }
      }

      const emitChange = () => {
        const workspaceState = Blockly.serialization.workspaces.save(workspace);
        const sequence = collectSequence(workspace);
        onChangeRef.current({ workspaceState, sequence });
      };

      workspace.addChangeListener((event) => {
        if (event.isUiEvent) return;
        emitChange();
      });

      emitChange();
      setIsLoading(false);

      // Restore LABEL for temi_show_image blocks that already have IMAGE_BASE64
      workspace.getAllBlocks(false)
        .filter((b) => b.type === "temi_show_image")
        .forEach((block, idx) => {
          const base64 = block.getFieldValue("IMAGE_BASE64");
          if (base64 && base64.length > 0) {
            block.setFieldValue(`(imagen ${idx + 1} ✅)`, "LABEL");
          }
        });

      // Expose a function to update IMAGE_BASE64 field by block ID
      if (onWorkspaceReady) {
        onWorkspaceReady((blockId: string, base64: string) => {
          const block = workspace.getBlockById(blockId);
          if (block) {
            block.setFieldValue(base64, "IMAGE_BASE64");
            // Update the visible label with the image number
            const allShowImageBlocks = workspace.getAllBlocks(false)
              .filter((b) => b.type === "temi_show_image");
            const imgNumber = allShowImageBlocks.indexOf(block) + 1;
            block.setFieldValue(`(imagen ${imgNumber} ✅)`, "LABEL");
            emitChange();
          }
        });
      }
    }

    void loadBlockly();

    return () => {
      isMounted = false;
      workspaceRef.current?.dispose();
      workspaceRef.current = null;
      blocklyRef.current = null;
    };
  }, [initialState, readOnly]);

  return (
    <div className="blockly-card">
      {isLoading ? <p className="blockly-loading">Cargando editor de bloques...</p> : null}
      <div className="blockly-canvas" ref={containerRef} />
    </div>
  );
}

