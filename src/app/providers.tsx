"use client";

import { DemoStoreProvider } from "@/components/demo-store-provider";
import { GoogleAuthProvider } from "@/components/google-auth-provider";

export function AppProviders({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <GoogleAuthProvider>
      <DemoStoreProvider>{children}</DemoStoreProvider>
    </GoogleAuthProvider>
  );
}

