import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import "./globals.css";

export const metadata: Metadata = {
  title: "CivicTriage — Municipal Operator Dashboard",
  description: "AI-assisted municipal grievance triage, multi-factor urgency scoring, duplicate detection, and human review.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-slate-950 text-slate-100 selection:bg-blue-600 selection:text-white">
        <Navbar />
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>
        <footer className="border-t border-slate-900 bg-slate-950 py-4 text-center text-xs text-slate-500">
          CivicTriage • Bhopal Municipal Operations • Strictly Draft Simulation (No Live Dispatch)
        </footer>
      </body>
    </html>
  );
}
