import type { Metadata, Viewport } from "next";
import { AppProviders } from "@/app/providers";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "Esbot EduLab",
  description: "Panel docente local para gestionar estudiantes y misiones de programación educativa."
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#2856a6"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
