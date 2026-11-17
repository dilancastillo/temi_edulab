import type { Metadata, Viewport } from "next";
import { Nunito_Sans } from "next/font/google";
import { AppProviders } from "@/app/providers";
import "@/app/globals.css";

// Tipografía de toda la plataforma (se descarga en el build y se sirve desde el propio servidor).
const appFont = Nunito_Sans({
  subsets: ["latin"],
  variable: "--font-app",
  display: "swap"
});

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
    <html className={appFont.variable} lang="es">
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
