import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import "./globals.css";

export const metadata: Metadata = {
  title: "CivicStage — Municipal Intelligence & AI Triage Platform",
  description: "AI-assisted municipal grievance triage, multi-factor urgency scoring, duplicate detection, and human review.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased dark">
      <body className="min-h-full flex flex-col bg-[var(--background)] text-[var(--foreground)] selection:bg-blue-500/30 selection:text-blue-100 relative overflow-x-hidden">
        {/* Background Ambient Aura Orbs */}
        <div className="fixed top-0 left-1/4 w-[640px] h-[380px] bg-blue-600/10 rounded-full blur-[140px] pointer-events-none -z-10" />
        <div className="fixed top-1/3 right-10 w-[520px] h-[420px] bg-indigo-600/8 rounded-full blur-[150px] pointer-events-none -z-10" />
        <div className="fixed bottom-10 left-10 w-[480px] h-[360px] bg-cyan-600/6 rounded-full blur-[130px] pointer-events-none -z-10" />

        <Navbar />

        <main className="flex-1 w-full max-w-[1520px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 py-7 relative z-10">
          {children}
        </main>

        <footer className="border-t border-[var(--border-subtle)] py-6 mt-auto bg-[#030712]/60 backdrop-blur-md">
          <div className="max-w-[1520px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="font-semibold text-slate-400">CivicStage Intelligence v4.2</span>
              <span className="text-slate-600">•</span>
              <span>Bhopal Municipal Corporation Operations</span>
            </div>
            <div className="flex items-center gap-4 text-[11px] text-slate-500 font-mono">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                Gemini 2.0 Flash Verified
              </span>
              <span className="hidden md:inline text-slate-700">|</span>
              <span className="text-slate-500">Safe Operator Dispatch Simulation</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
