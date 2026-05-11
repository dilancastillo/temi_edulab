"use client";

import { AuthStoreProvider } from "@/components/auth-store-provider";
import { DemoStoreProvider } from "@/components/demo-store-provider";
import { GoogleAuthProvider } from "@/components/google-auth-provider";

const isDev = process.env.NODE_ENV === "development";

export function AppProviders({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <GoogleAuthProvider>
      {isDev
        ? <DemoStoreProvider>{children}</DemoStoreProvider>
        : <AuthStoreProvider>{children}</AuthStoreProvider>
      }
    </GoogleAuthProvider>
  );
}
