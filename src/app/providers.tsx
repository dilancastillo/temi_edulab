"use client";

import { DemoStoreProvider } from "@/components/demo-store-provider";

export function AppProviders({ children }: Readonly<{ children: React.ReactNode }>) {
  return <DemoStoreProvider>{children}</DemoStoreProvider>;
}

