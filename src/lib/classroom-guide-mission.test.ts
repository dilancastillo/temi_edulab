import { describe, expect, it } from "vitest";
import {
  applyAdvancedChange,
  buildClassroomGuideWorkspace,
  completeCheckpoint,
  completeFarewell,
  completeGreeting,
  evaluateClassroomGuideWorkspace,
  getClassroomGuideLocationOptions
} from "@/lib/classroom-guide-mission";
import type { WorkshopSession } from "@/lib/types";

const guidedWorkshop: WorkshopSession = {
  missionType: "classroom_guide",
  workshopName: "Temi guia mi salon",
  studentMode: "guided",
  participationMode: "teams",
  deviceMode: "team_device",
  executionMode: "normal",
  turnDurationMinutes: 7,
  baseLocationName: "salon 5a",
  checkpoints: [
    {
      locationName: "tablero",
      alias: "Nuestro tablero",
      iconKey: "board",
      messageMode: "template",
      messageText: "Nuestro tablero. Aqui explicamos ideas importantes."
    },
    {
      locationName: "biblioteca",
      alias: "Biblioteca del salon",
      iconKey: "books",
      messageMode: "template",
      messageText: "Biblioteca del salon. Aqui encontramos muchos libros."
    },
    {
      locationName: "rincon creativo",
      alias: "Rincon creativo",
      iconKey: "paint",
      messageMode: "template",
      messageText: "Rincon creativo. Aqui mostramos trabajos del grupo."
    }
  ],
  checklist: {
    robotConnected: true,
    batteryReady: true,
    mapReady: true,
    checkpointsReady: true,
    baseReady: true,
    routeSafeConfirmed: true,
    executionModeConfirmed: true
  }
};

describe("classroom guide mission", () => {
  it("builds a guided workspace from workshop config", () => {
    const workspace = buildClassroomGuideWorkspace(guidedWorkshop);

    expect(workspace.mode).toBe("guided");
    expect(workspace.checkpoints[0]?.alias).toBe("Nuestro tablero");
    expect(workspace.checkpoints[0]?.teacherAlias).toBe("Nuestro tablero");
    expect(workspace.baseLocationName).toBe("salon 5a");
    expect(workspace.greeting.done).toBe(false);
    expect(workspace.checkpoints[0]?.studentMessage).toBe("");
  });

  it("can complete the guided mode one step at a time", () => {
    let workspace = buildClassroomGuideWorkspace(guidedWorkshop);
    workspace = {
      ...workspace,
      greeting: {
        text: "Hola. Soy Temi y hoy voy a guiar nuestro salon.",
        done: false
      }
    };
    workspace = completeGreeting(workspace);
    workspace = {
      ...workspace,
      farewell: {
        text: "Gracias por la visita. Ahora voy a volver al punto base.",
        done: false
      }
    };
    workspace = {
      ...workspace,
      checkpoints: workspace.checkpoints.map((checkpoint, index) => ({
        ...checkpoint,
        studentMessage: checkpoint.teacherPrompt || `Mensaje ${index + 1}`
      }))
    };
    workspace = completeCheckpoint(workspace, 0);
    workspace = completeCheckpoint(workspace, 1);
    workspace = completeCheckpoint(workspace, 2);
    workspace = completeFarewell(workspace);

    const evaluation = evaluateClassroomGuideWorkspace(workspace);

    expect(evaluation.completedChallenges).toBe(5);
    expect(evaluation.completedVisibleSteps).toBe(5);
    expect(evaluation.totalVisibleSteps).toBe(5);
    expect(evaluation.isReadyToSubmit).toBe(true);
  });

  it("uses the teacher-selected advanced mode from the workshop", () => {
    const workspace = buildClassroomGuideWorkspace({
      ...guidedWorkshop,
      studentMode: "advanced"
    });

    expect(workspace.mode).toBe("advanced");
    expect(evaluateClassroomGuideWorkspace(workspace).totalVisibleSteps).toBe(10);
  });

  it("requires a full valid block program in advanced mode", () => {
    let workspace = buildClassroomGuideWorkspace({
      ...guidedWorkshop,
      studentMode: "advanced"
    });

    workspace = applyAdvancedChange(workspace, {
      sequence: [
        "guide_start",
        "guide_greeting",
        "guide_go_to",
        "guide_explain",
        "guide_go_to",
        "guide_explain",
        "guide_go_to",
        "guide_explain",
        "guide_farewell",
        "guide_return_base"
      ],
      draft: {
        greetingText: "Hola. Soy Temi y hoy voy a guiar nuestro salon.",
        farewellText: "Gracias por la visita. Ahora voy a volver al punto base.",
        stops: [
          {
            locationName: "tablero",
            alias: "Nuestro tablero",
            iconKey: "board",
            messageText: "Nuestro tablero. Aqui explicamos ideas importantes."
          },
          {
            locationName: "biblioteca",
            alias: "Biblioteca del salon",
            iconKey: "books",
            messageText: "Biblioteca del salon. Aqui encontramos muchos libros."
          },
          {
            locationName: "rincon creativo",
            alias: "Rincon creativo",
            iconKey: "paint",
            messageText: "Rincon creativo. Aqui mostramos trabajos del grupo."
          }
        ]
      },
      workspaceState: {}
    });

    const evaluation = evaluateClassroomGuideWorkspace(workspace);

    expect(evaluation.isAdvancedSequenceComplete).toBe(true);
    expect(evaluation.isReadyToSubmit).toBe(true);
    expect(evaluation.completedVisibleSteps).toBe(10);
    expect(evaluation.totalVisibleSteps).toBe(10);
    expect(workspace.checkpoints[1]?.locationName).toBe("biblioteca");
    expect(workspace.checkpoints[1]?.studentMessage).toContain("libros");
  });

  it("accepts short child-friendly texts in advanced mode", () => {
    let workspace = buildClassroomGuideWorkspace({
      ...guidedWorkshop,
      studentMode: "advanced"
    });

    workspace = applyAdvancedChange(workspace, {
      sequence: [
        "guide_start",
        "guide_greeting",
        "guide_go_to",
        "guide_explain",
        "guide_go_to",
        "guide_explain",
        "guide_go_to",
        "guide_explain",
        "guide_farewell",
        "guide_return_base"
      ],
      draft: {
        greetingText: "Hola",
        farewellText: "Chao",
        stops: [
          {
            locationName: "tablero",
            alias: "Nuestro tablero",
            iconKey: "board",
            messageText: "Aqui"
          },
          {
            locationName: "biblioteca",
            alias: "Biblioteca del salon",
            iconKey: "books",
            messageText: "Libros"
          },
          {
            locationName: "rincon creativo",
            alias: "Rincon creativo",
            iconKey: "paint",
            messageText: "Arte"
          }
        ]
      },
      workspaceState: {}
    });

    const evaluation = evaluateClassroomGuideWorkspace(workspace);

    expect(evaluation.completedVisibleSteps).toBe(10);
    expect(evaluation.isReadyToSubmit).toBe(true);
  });

  it("keeps the teacher location pool stable in advanced mode", () => {
    const workspace = buildClassroomGuideWorkspace(guidedWorkshop, {
      missionType: "classroom_guide",
      mode: "advanced",
      checkpoints: [
        {
          locationName: "biblioteca",
          alias: "Biblioteca",
          iconKey: "books",
          teacherPrompt: "corrupto",
          teacherLocationName: "biblioteca",
          teacherAlias: "Biblioteca",
          teacherIconKey: "books",
          studentMessage: "",
          done: false
        },
        {
          locationName: "salon 5a",
          alias: "Salon 5a",
          iconKey: "board",
          teacherPrompt: "corrupto",
          teacherLocationName: "salon 5a",
          teacherAlias: "Salon 5a",
          teacherIconKey: "board",
          studentMessage: "",
          done: false
        },
        {
          locationName: "laboratorio",
          alias: "Laboratorio",
          iconKey: "microscope",
          teacherPrompt: "corrupto",
          teacherLocationName: "salon 5a",
          teacherAlias: "Salon 5a",
          teacherIconKey: "board",
          studentMessage: "",
          done: false
        }
      ]
    });

    expect(getClassroomGuideLocationOptions(workspace).map((option) => option.locationName)).toEqual([
      "tablero",
      "biblioteca",
      "rincon creativo"
    ]);
  });
});
