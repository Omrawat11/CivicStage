import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import "./globals.css";

export const metadata: Metadata = {
  title: "CivicStage — Municipal Intelligence Platform",
  description: "AI-assisted municipal grievance triage, multi-factor urgency scoring, duplicate detection, and human review.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[var(--background)] text-[var(--foreground)] selection:bg-blue-600/40 selection:text-white">
        <Navbar />
        <main className="flex-1 w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 py-8 page-glow relative">
          <div className="relative z-10">
            {children}
          </div>
        </main>
        <footer className="border-t border-[var(--border-subtle)] py-5 mt-auto">
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/60"></div>
              <span>CivicStage • Bhopal Municipal Corporation</span>
            </div>
            <p className="text-[11px] text-slate-600 font-mono">
              Draft Simulation Environment — No Live Dispatch
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
