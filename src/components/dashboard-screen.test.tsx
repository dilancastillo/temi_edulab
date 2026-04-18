import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AuthStoreProvider } from "@/components/auth-store-provider";
import { DashboardScreen } from "@/components/dashboard-screen";

// Mock Supabase to avoid requiring env vars in tests
vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      upsert: vi.fn().mockResolvedValue({ error: null }),
      delete: vi.fn().mockReturnThis(),
    }),
  },
}));

describe("DashboardScreen", () => {
  it("renders professor summary metrics", async () => {
    render(
      <AuthStoreProvider>
        <DashboardScreen />
      </AuthStoreProvider>
    );

    expect(await screen.findByRole("heading", { name: /bienvenido, profesor/i })).toBeInTheDocument();
    expect(screen.getByText(/estudiantes por revisar/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /ver todas/i })).toHaveAttribute("href", "/profesor/misiones");
  });
});

