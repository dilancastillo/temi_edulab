"use client";

import { AuthStoreProvider } from "@/components/auth-store-provider";
import { GoogleAuthProvider } from "@/components/google-auth-provider";

export function AppProviders({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <GoogleAuthProvider>
      <AuthStoreProvider>{children}</AuthStoreProvider>
    </GoogleAuthProvider>
  );
}

