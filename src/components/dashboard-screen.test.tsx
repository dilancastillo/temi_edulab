import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DemoStoreProvider } from "@/components/demo-store-provider";
import { DashboardScreen } from "@/components/dashboard-screen";
import type { AppBootstrap } from "@/lib/types";

const bootstrap: AppBootstrap = {
  session: {
    userId: "teacher-demo",
    institutionId: "inst-esbot",
    role: "teacher",
    provider: "password",
    displayName: "Elena Martinez",
    email: "profesor@esbot.test"
  },
  institution: {
    id: "inst-esbot",
    name: "Colegio Esbot EduLab",
    slug: "esbot-edulab"
  },
  courses: [{ id: "course-10a", institutionId: "inst-esbot", name: "10 A", level: "10" }],
  missions: [
    {
      id: "mission-order-steps",
      title: "Ordena los pasos",
      summary: "Organiza instrucciones paso a paso.",
      category: "Fundamentos",
      ageBand: "7-10",
      durationMinutes: 20,
      outcomes: ["Secuenciacion"],
      status: "published",
      coverTone: "blue"
    }
  ],
  students: [
    {
      id: "student-ana",
      institutionId: "inst-esbot",
      courseId: "course-10a",
      fullName: "Ana Garcia",
      email: "ana.garcia@esbot.test",
      progress: "Revisar",
      currentMissionId: "mission-order-steps",
      createdAt: "2026-04-01T13:00:00.000Z"
    }
  ],
  assignments: [
    {
      id: "assignment-order-steps-10a",
      institutionId: "inst-esbot",
      courseId: "course-10a",
      missionId: "mission-order-steps",
      missionCode: "SGKRBY",
      status: "active",
      assignedAt: "2026-04-04T14:00:00.000Z",
      assignedBy: "teacher-demo",
      completedCount: 0,
      reviewCount: 1
    }
  ],
  studentWorks: [],
  profile: {
    id: "teacher-demo",
    institutionId: "inst-esbot",
    fullName: "Elena Martinez",
    email: "profesor@esbot.test",
    biography: "Docente STEAM"
  },
  robots: [
    {
      id: "robot-temi-5a",
      institutionId: "inst-esbot",
      courseId: "course-10a",
      displayName: "Temi V3 Aula 5A",
      classroomName: "5A Ciencias",
      connectionState: "CONNECTED",
      batteryPercent: 82,
      statusLabel: "Listo"
    }
  ],
  classSessions: [],
  pairingRequests: []
};

describe("DashboardScreen", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        headers: {
          get: () => "application/json"
        },
        json: async () => bootstrap
      }))
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders professor summary metrics", async () => {
    render(
      <DemoStoreProvider>
        <DashboardScreen />
      </DemoStoreProvider>
    );

    expect(await screen.findByRole("heading", { name: /bienvenido, profesor/i })).toBeInTheDocument();
    expect(screen.getByText(/estudiantes por revisar/i)).toBeInTheDocument();
    expect(screen.getByText(/robots conectados/i)).toBeInTheDocument();
  });
});
