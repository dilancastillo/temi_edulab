import { Inter } from "next/font/google";

// Tipografía del reporte imprimible (se descarga en el build y se sirve desde el propio servidor).
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-report",
  display: "swap"
});

export default function ReportLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <div className={`${inter.variable} report-typography`}>{children}</div>;
}
