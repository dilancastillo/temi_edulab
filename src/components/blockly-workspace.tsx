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
  onWorkspaceReady?: (updateImageBase64ById: (blockId: string, base64: string) => void, updateVideoUrlById: (blockId: string, videoUrl: string) => void) => void;
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
        { kind: "block", type: "temi_show_image" },
        { kind: "block", type: "temi_show_video" }
      ]
    },
    {
      kind: "category",
      name: "Audio",
      colour: "#1f8f4d",
      contents: [{ kind: "block", type: "temi_audio" }]
    },
    {
      kind: "category",
      name: "Condición",
      colour: "#c84b1f",
      contents: [{ kind: "block", type: "temi_condition" }]
    },
    {
      kind: "category",
      name: "Control",
      colour: "#4a7c59",
      contents: [{ kind: "block", type: "temi_repeat" }]
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
      type: "temi_show_video",
      message0: "reproducir video",
      previousStatement: null,
      nextStatement: null,
      colour: 40,
      tooltip: "Reproduce un video en pantalla completa",
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
    },
    {
      type: "temi_repeat",
      message0: "repetir %1 veces",
      args0: [{ type: "field_number", name: "TIMES", value: 2, min: 1, max: 10, precision: 1 }],
      message1: "%1",
      args1: [{ type: "input_statement", name: "DO" }],
      previousStatement: null,
      nextStatement: null,
      colour: 120,
      tooltip: "Repite los bloques internos N veces",
      helpUrl: ""
    }
  ]);

  // Add hidden IMAGE_URL field and visible LABEL field to temi_show_image block
  Blockly.Blocks["temi_show_image"].init = function (this: BlocklyType.Block) {
    this.appendDummyInput()
      .appendField("mostrar imagen")
      .appendField(new Blockly.FieldLabel("📷 Cargar imagen"), "LABEL");
    this.appendDummyInput("IMAGE_FIELD")
      .appendField(new Blockly.FieldTextInput(""), "IMAGE_URL")
      .setVisible(false);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(40);
    this.setTooltip("Muestra una imagen en pantalla completa durante 7 segundos");
  };

  // temi_show_video: hidden VIDEO_URL field + visible LABEL
  Blockly.Blocks["temi_show_video"].init = function (this: BlocklyType.Block) {
    this.appendDummyInput()
      .appendField("reproducir video")
      .appendField(new Blockly.FieldLabel("(sin video)"), "LABEL");
    this.appendDummyInput("VIDEO_FIELD")
      .appendField(new Blockly.FieldTextInput(""), "VIDEO_URL")
      .setVisible(false);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(40);
    this.setTooltip("Reproduce un video en pantalla completa");
  };

  // temi_condition: pregunta + N opciones dinámicas (2..5)
  // Registrar el tipo vacío primero para que Blockly lo reconozca
  if (!Blockly.Blocks["temi_condition"]) {
    Blockly.Blocks["temi_condition"] = { init: function () {} };
  }
  Blockly.Blocks["temi_condition"].init = function (this: BlocklyType.Block) {
    this.appendDummyInput()
      .appendField("si pregunta")
      .appendField(new Blockly.FieldTextInput("¿A dónde quieres ir?"), "QUESTION");
    this.appendDummyInput()
      .appendField("número de opciones")
      .appendField(new Blockly.FieldNumber(2, 2, 5, 1), "OPTION_COUNT");

    // Render 5 option rows; rows beyond OPTION_COUNT are hidden
    for (let i = 1; i <= 5; i++) {
      const row = this.appendDummyInput(`OPTION_ROW_${i}`)
        .appendField(`Opción ${i} — si dice`)
        .appendField(new Blockly.FieldTextInput(`opcion${i}`), `KEYWORD_${i}`)
        .appendField("→ acción")
        .appendField(
          new Blockly.FieldDropdown([
            ["Ir a ubicación", "Navigate"],
            ["Decir texto", "Say"],
            ["Mostrar imagen", "ShowImage"]
          ]),
          `ACTION_TYPE_${i}`
        );

      // Add all three possible field types, but only one will be visible at a time
      // Navigate: dropdown with locations
      const locationOptions: [string, string][] = locations.length > 0 
        ? locations.map((l) => [l, l]) 
        : [["Sala Principal", "Sala Principal"]];
      row.appendField(
        new Blockly.FieldDropdown(locationOptions),
        `ACTION_VALUE_NAVIGATE_${i}`
      );
      
      // Say: text input
      row.appendField(
        new Blockly.FieldTextInput(""),
        `ACTION_VALUE_SAY_${i}`
      );
      
      // ShowImage: label + hidden field
      row.appendField(new Blockly.FieldLabel("📷 Cargar imagen"), `ACTION_VALUE_SHOWIMAGE_${i}`);
      row.appendField(
        new Blockly.FieldTextInput(""),
        `ACTION_VALUE_HIDDEN_${i}`
      );
      
      // Hide all value fields initially
      const navField = this.getField(`ACTION_VALUE_NAVIGATE_${i}`);
      const sayField = this.getField(`ACTION_VALUE_SAY_${i}`);
      const imgField = this.getField(`ACTION_VALUE_SHOWIMAGE_${i}`);
      const hiddenField = this.getField(`ACTION_VALUE_HIDDEN_${i}`);
      if (navField) navField.setVisible(false);
      if (sayField) sayField.setVisible(false);
      if (imgField) imgField.setVisible(false);
      if (hiddenField) hiddenField.setVisible(false);
    }

    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(20);
    this.setTooltip("El robot pregunta y reacciona según la respuesta del usuario");

    // Hide rows beyond initial OPTION_COUNT and update ACTION_VALUE fields
    const updateVisibility = () => {
      const count = Math.min(5, Math.max(2, this.getFieldValue("OPTION_COUNT") as unknown as number));
      for (let i = 1; i <= 5; i++) {
        const row = this.getInput(`OPTION_ROW_${i}`);
        if (row) {
          row.setVisible(i <= count);
          // Update ACTION_VALUE field visibility for this row if visible
          if (i <= count) {
            updateActionValueVisibility(this, i);
          }
        }
      }
      if (this.rendered) this.render();
    };

    // Listen for changes to OPTION_COUNT
    const optCountField = this.getField("OPTION_COUNT");
    if (optCountField) {
      optCountField.setValidator((value: string) => {
        setTimeout(() => updateVisibility(), 0);
        return value;
      });
    }

    // Listen for changes to ACTION_TYPE fields
    for (let i = 1; i <= 5; i++) {
      const actionTypeField = this.getField(`ACTION_TYPE_${i}`);
      if (actionTypeField) {
        actionTypeField.setValidator((value: string) => {
          setTimeout(() => updateActionValueVisibility(this, i), 0);
          return value;
        });
      }
    }

    updateVisibility();
  };

  // Helper function to show/hide ACTION_VALUE fields based on ACTION_TYPE
  const updateActionValueVisibility = (block: BlocklyType.Block, optionIndex: number) => {
    const actionType = block.getFieldValue(`ACTION_TYPE_${optionIndex}`);
    
    const navField = block.getField(`ACTION_VALUE_NAVIGATE_${optionIndex}`) as any;
    const sayField = block.getField(`ACTION_VALUE_SAY_${optionIndex}`);
    const imgField = block.getField(`ACTION_VALUE_SHOWIMAGE_${optionIndex}`) as any;
    const hiddenField = block.getField(`ACTION_VALUE_HIDDEN_${optionIndex}`);
    
    // Hide all
    if (navField) navField.setVisible(false);
    if (sayField) sayField.setVisible(false);
    if (imgField) imgField.setVisible(false);
    if (hiddenField) hiddenField.setVisible(false);
    
    // Show the appropriate one
    if (actionType === "Navigate") {
      if (navField) {
        navField.setVisible(true);
        // Update dropdown options with actual locations
        const locationOptions: [string, string][] = locations.length > 0 
          ? locations.map((l) => [l, l]) 
          : [["Sala Principal", "Sala Principal"]];
        
        // Update the dropdown's options
        navField.menuGenerator_ = locationOptions;
        
        // Set default value if not set
        const currentValue = block.getFieldValue(`ACTION_VALUE_NAVIGATE_${optionIndex}`) || locationOptions[0][1];
        block.setFieldValue(currentValue, `ACTION_VALUE_NAVIGATE_${optionIndex}`);
      }
    } else if (actionType === "Say") {
      if (sayField) sayField.setVisible(true);
    } else if (actionType === "ShowImage") {
      if (imgField) imgField.setVisible(true);
      if (hiddenField) hiddenField.setVisible(false); // Keep hidden but present
      
      // Setup click handler for image field - use a direct approach
      const setupImageClick = () => {
        const labelElement = (imgField).getTextElement?.();
        if (labelElement && !labelElement.dataset.imageClickSetup) {
          labelElement.dataset.imageClickSetup = "true";
          labelElement.style.cursor = "pointer";
          labelElement.style.textDecoration = "underline";
          labelElement.style.fontWeight = "bold";
          labelElement.style.color = "#FF9800";
          labelElement.style.paddingLeft = "8px";
          labelElement.style.paddingRight = "8px";
          labelElement.style.userSelect = "none";
          
          labelElement.onclick = (e: any) => {
            e.stopPropagation();
            e.preventDefault();
            
            const fileInput = document.createElement("input");
            fileInput.type = "file";
            fileInput.accept = "image/*";
            
            fileInput.onchange = async () => {
              const file = fileInput.files?.[0];
              if (file) {
                labelElement.textContent = "⏳ Subiendo...";
                labelElement.style.color = "#FF9800";
                
                try {
                  const formData = new FormData();
                  formData.append("image", file);
                  const res = await fetch("/api/image/upload", { method: "POST", body: formData });
                  const data = (await res.json()) as { ok: boolean; imageUrl?: string; message?: string };
                  
                  if (data.ok && data.imageUrl) {
                    block.setFieldValue(data.imageUrl, `ACTION_VALUE_HIDDEN_${optionIndex}`);
                    labelElement.textContent = "✅ Imagen seleccionada";
                    labelElement.style.color = "#4CAF50";
                  } else {
                    labelElement.textContent = "❌ Error al subir";
                    labelElement.style.color = "#F44336";
                  }
                } catch (error) {
                  console.error("Image upload error:", error);
                  labelElement.textContent = "❌ Error al subir";
                  labelElement.style.color = "#F44336";
                }
              }
            };
            
            fileInput.click();
          };
        }
      };
      
      // Try immediately and also after a small delay
      setupImageClick();
      setTimeout(setupImageClick, 50);
    }
    
    if (block.rendered) block.render();
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

      if (!isMounted || !containerRef.current) return;
      // Verificar que el contenedor sigue en el documento
      if (!document.contains(containerRef.current)) return;

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

      // Restore LABEL for temi_show_image blocks that already have IMAGE_URL
      workspace.getAllBlocks(false)
        .filter((b) => b.type === "temi_show_image")
        .forEach((block) => {
          const imageUrl = block.getFieldValue("IMAGE_URL");
          if (imageUrl && imageUrl.length > 0) {
            block.setFieldValue("✅ Imagen seleccionada", "LABEL");
          }
        });

      // Setup click handler for temi_show_image LABEL field
      const setupImageBlockClick = () => {
        workspace.getAllBlocks(false)
          .filter((b) => b.type === "temi_show_image")
          .forEach((block) => {
            const labelField = block.getField("LABEL") as any;
            if (!labelField) return;
            
            const labelElement = labelField.getTextElement?.();
            if (!labelElement) return;
            
            if (labelElement.dataset.imageClickSetup) return;
            labelElement.dataset.imageClickSetup = "true";
            
            labelElement.style.cursor = "pointer";
            labelElement.style.textDecoration = "underline";
            labelElement.style.fontWeight = "bold";
            labelElement.style.color = "#FF9800";
            labelElement.style.paddingLeft = "8px";
            labelElement.style.paddingRight = "8px";
            labelElement.style.userSelect = "none";
            labelElement.style.display = "inline-block";
            
            const handleClick = async (e: any) => {
              e.stopPropagation();
              e.preventDefault();
              
              const fileInput = document.createElement("input");
              fileInput.type = "file";
              fileInput.accept = "image/*";
              
              fileInput.onchange = async () => {
                const file = fileInput.files?.[0];
                if (file) {
                  const originalText = labelElement.textContent;
                  labelElement.textContent = "⏳ Subiendo...";
                  labelElement.style.color = "#FF9800";
                  
                  try {
                    const formData = new FormData();
                    formData.append("image", file);
                    const res = await fetch("/api/image/upload", { method: "POST", body: formData });
                    const data = (await res.json()) as { ok: boolean; imageUrl?: string; message?: string };
                    
                    if (data.ok && data.imageUrl) {
                      block.setFieldValue(data.imageUrl, "IMAGE_URL");
                      block.setFieldValue("✅ Imagen seleccionada", "LABEL");
                      labelElement.textContent = "✅ Imagen seleccionada";
                      labelElement.style.color = "#4CAF50";
                      emitChange();
                    } else {
                      labelElement.textContent = "❌ Error al subir";
                      labelElement.style.color = "#F44336";
                      setTimeout(() => {
                        labelElement.textContent = originalText;
                        labelElement.style.color = "#FF9800";
                      }, 2000);
                    }
                  } catch (error) {
                    console.error("Image upload error:", error);
                    labelElement.textContent = "❌ Error al subir";
                    labelElement.style.color = "#F44336";
                    setTimeout(() => {
                      labelElement.textContent = originalText;
                      labelElement.style.color = "#FF9800";
                    }, 2000);
                  }
                }
              };
              
              fileInput.click();
            };
            
            labelElement.removeEventListener("click", handleClick);
            labelElement.addEventListener("click", handleClick);
          });
      };
      
      setupImageBlockClick();
      workspace.addChangeListener(() => {
        setTimeout(setupImageBlockClick, 100);
      });

      // Restore LABEL for temi_show_video blocks that already have VIDEO_URL
      workspace.getAllBlocks(false)
        .filter((b) => b.type === "temi_show_video")
        .forEach((block, idx) => {
          const url = block.getFieldValue("VIDEO_URL");
          if (url && url.length > 0) {
            block.setFieldValue(`(video ${idx + 1} ✅)`, "LABEL");
          }
        });

      // Restore LABEL for temi_condition blocks with ShowImage actions
      workspace.getAllBlocks(false)
        .filter((b) => b.type === "temi_condition")
        .forEach((block) => {
          const optionCount = parseInt(block.getFieldValue("OPTION_COUNT") as string, 10);
          for (let i = 1; i <= optionCount; i++) {
            const actionType = block.getFieldValue(`ACTION_TYPE_${i}`);
            if (actionType === "ShowImage") {
              const base64 = block.getFieldValue(`ACTION_VALUE_HIDDEN_${i}`);
              if (base64 && base64.length > 0) {
                const imgField = block.getField(`ACTION_VALUE_SHOWIMAGE_${i}`);
                if (imgField) {
                  (imgField as any).setValue("✅ Imagen seleccionada");
                  (imgField as any).getTextElement().style.color = "#4CAF50";
                }
              }
            }
          }
        });

      // Expose functions to update IMAGE_URL and VIDEO_URL fields by block ID
      if (onWorkspaceReady) {
        const updateImageBase64ById = (blockId: string, imageUrl: string) => {
          const block = workspace.getBlockById(blockId);
          if (block) {
            if (block.type === "temi_show_image") {
              block.setFieldValue(imageUrl, "IMAGE_URL");
              const allShowImageBlocks = workspace.getAllBlocks(false).filter((b) => b.type === "temi_show_image");
              const imgNumber = allShowImageBlocks.indexOf(block) + 1;
              block.setFieldValue(`(imagen ${imgNumber} ✅)`, "LABEL");
            } else if (block.type === "temi_condition") {
              // Find which option this is for (we need to search by block ID and field)
              // This is a bit tricky since we're updating from outside
              // For now, just update the first ACTION_VALUE field that's empty
              for (let i = 1; i <= 5; i++) {
                const field = block.getField(`ACTION_VALUE_${i}`);
                if (field && !field.getValue?.()) {
                  block.setFieldValue(imageUrl, `ACTION_VALUE_${i}`);
                  const labelField = block.getField(`ACTION_VALUE_LABEL_${i}`);
                  if (labelField) {
                    (labelField as any).setValue("(imagen ✅)");
                  }
                  break;
                }
              }
            }
            emitChange();
          }
        };
        const updateVideoUrlById = (blockId: string, videoUrl: string) => {
          const block = workspace.getBlockById(blockId);
          if (block) {
            block.setFieldValue(videoUrl, "VIDEO_URL");
            const allVideoBlocks = workspace.getAllBlocks(false).filter((b) => b.type === "temi_show_video");
            const vidNumber = allVideoBlocks.indexOf(block) + 1;
            block.setFieldValue(`(video ${vidNumber} ✅)`, "LABEL");
            emitChange();
          }
        };
        onWorkspaceReady(updateImageBase64ById, updateVideoUrlById);
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

