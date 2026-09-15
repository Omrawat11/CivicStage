"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, LayoutDashboard, ListFilter, ShieldCheck, BarChart3, Award } from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-slate-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand & City badge */}
          <div className="flex items-center space-x-3">
            <Link href="/" className="flex items-center space-x-2.5 group">
              <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:bg-blue-500 transition-colors">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-bold tracking-tight text-white text-lg">CivicTriage</span>
                  <span className="px-1.5 py-0.5 text-[10px] uppercase font-semibold tracking-wider bg-blue-900/80 text-blue-300 border border-blue-700/50 rounded">
                    Phase 4
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-medium">Bhopal Municipal Corporation • Operations & Reports</p>
              </div>
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="flex items-center space-x-1 sm:space-x-2">
            <Link
              href="/"
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                pathname === "/"
                  ? "bg-slate-800 text-white shadow-inner"
                  : "text-slate-300 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard</span>
            </Link>

            <Link
              href="/complaints"
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                pathname.startsWith("/complaints")
                  ? "bg-slate-800 text-white shadow-inner"
                  : "text-slate-300 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              <ListFilter className="w-4 h-4" />
              <span>Queue</span>
            </Link>

            <Link
              href="/reports"
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                pathname.startsWith("/reports")
                  ? "bg-slate-800 text-white shadow-inner"
                  : "text-slate-300 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Reports</span>
            </Link>

            <Link
              href="/evaluation"
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                pathname.startsWith("/evaluation")
                  ? "bg-slate-800 text-white shadow-inner"
                  : "text-slate-300 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              <Award className="w-4 h-4" />
              <span>Evaluation</span>
            </Link>
          </nav>

          {/* Operator Status Indicator */}
          <div className="hidden md:flex items-center space-x-3 border-l border-slate-800 pl-4">
            <div className="flex items-center space-x-1.5 text-xs text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 px-2.5 py-1 rounded-full">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-medium">System Online</span>
            </div>
            <div className="flex items-center space-x-1 text-xs text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              <span>Human-in-the-Loop</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
