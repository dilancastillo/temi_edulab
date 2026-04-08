import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DemoStoreProvider } from "@/components/demo-store-provider";
import { DashboardScreen } from "@/components/dashboard-screen";

describe("DashboardScreen", () => {
  it("renders professor summary metrics", async () => {
    render(
      <DemoStoreProvider>
        <DashboardScreen />
      </DemoStoreProvider>
    );

    expect(await screen.findByRole("heading", { name: /bienvenido, profesor/i })).toBeInTheDocument();
    expect(screen.getByText(/estudiantes por revisar/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /ver todas/i })).toHaveAttribute("href", "/profesor/misiones");
  });
});

