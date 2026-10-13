"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  Building2,
  LayoutDashboard,
  ListFilter,
  BarChart3,
  Award,
  Menu,
  X,
  PlusCircle,
  Sparkles,
  ShieldCheck,
  Zap,
} from "lucide-react";
import IntakeModal from "./IntakeModal";
import { ComplaintDetail } from "@/lib/api";

const navItems = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard", match: (p: string) => p === "/" },
  { href: "/complaints", icon: ListFilter, label: "Triage Queue", match: (p: string) => p.startsWith("/complaints") },
  { href: "/reports", icon: BarChart3, label: "Reports & KPIs", match: (p: string) => p.startsWith("/reports") },
  { href: "/evaluation", icon: Award, label: "AI Benchmark", match: (p: string) => p.startsWith("/evaluation") },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isIntakeOpen, setIsIntakeOpen] = useState(false);

  const handleIntakeSuccess = (complaint: ComplaintDetail) => {
    setIsIntakeOpen(false);
    router.push(`/complaints/${complaint.complaint_id}`);
  };

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-[var(--border-subtle)] bg-[#030712]/80 backdrop-blur-2xl transition-all">
        <div className="max-w-[1520px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10">
          <div className="flex items-center justify-between h-17">
            {/* Brand Logo & Title */}
            <div className="flex items-center gap-5">
              <Link href="/" className="flex items-center gap-3.5 group">
                <div className="relative">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white transition-all duration-300 group-hover:scale-105 group-hover:shadow-[0_0_24px_rgba(59,130,246,0.4)]"
                    style={{
                      background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%)",
                      boxShadow: "0 4px 14px rgba(37, 99, 235, 0.35)",
                    }}
                  >
                    <Building2 className="w-5 h-5 text-white" />
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#030712] shadow-sm"></div>
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold tracking-tight text-white text-[16px] group-hover:text-blue-200 transition-colors">
                      CivicStage
                    </span>
                    <span className="px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded-md text-blue-300 border border-blue-500/20 bg-blue-500/10">
                      v4.2 AI
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-medium tracking-wide hidden sm:block">
                    Bhopal Municipal Operations
                  </p>
                </div>
              </Link>
            </div>

            {/* Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center gap-1.5 p-1 rounded-xl bg-slate-900/40 border border-white/[0.05]">
              {navItems.map(({ href, icon: Icon, label, match }) => {
                const isActive = match(pathname);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`relative flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-[13px] font-semibold transition-all duration-200 ${
                      isActive
                        ? "text-white bg-blue-600/20 text-blue-300 border border-blue-500/30 shadow-[0_0_12px_rgba(59,130,246,0.15)]"
                        : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? "text-blue-400" : "text-slate-400"}`} />
                    <span>{label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Right Section: System Telemetry & Quick Intake */}
            <div className="hidden sm:flex items-center gap-3">
              {/* Telemetry Status */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs bg-emerald-950/40 border border-emerald-800/40 text-emerald-400">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-70"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                </span>
                <span className="font-semibold text-[11px] tracking-wide">Gemini 2.0 Flash</span>
              </div>

              {/* Quick Intake Button */}
              <button
                onClick={() => setIsIntakeOpen(true)}
                className="btn-sheen flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-lg transition-all duration-200 hover:scale-[1.03] active:scale-[0.98]"
                style={{
                  background: "linear-gradient(135deg, #2563eb 0%, #3b82f6 50%, #4f46e5 100%)",
                  boxShadow: "0 4px 18px rgba(37, 99, 235, 0.35)",
                }}
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>New Intake</span>
              </button>
            </div>

            {/* Mobile Menu Toggle */}
            <div className="flex items-center gap-2 lg:hidden">
              <button
                onClick={() => setIsIntakeOpen(true)}
                className="p-2 rounded-lg bg-blue-600 text-white sm:hidden"
                aria-label="New Intake"
              >
                <PlusCircle className="w-4 h-4" />
              </button>
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.05] transition-colors border border-white/[0.06]"
                aria-label="Toggle menu"
              >
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Mobile Menu Dropdown */}
          {mobileOpen && (
            <div className="lg:hidden py-3 pb-4 border-t border-[var(--border-subtle)] space-y-1.5 animate-float-up">
              {navItems.map(({ href, icon: Icon, label, match }) => {
                const isActive = match(pathname);
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                      isActive
                        ? "text-white bg-blue-600/20 border border-blue-500/30 text-blue-300"
                        : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? "text-blue-400" : ""}`} />
                    <span>{label}</span>
                  </Link>
                );
              })}
              <div className="pt-2 px-1">
                <button
                  onClick={() => {
                    setMobileOpen(false);
                    setIsIntakeOpen(true);
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-bold text-white rounded-xl bg-blue-600"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Start New Grievance Intake</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Global Intake Modal mounted from Navbar */}
      <IntakeModal
        isOpen={isIntakeOpen}
        onClose={() => setIsIntakeOpen(false)}
        onSuccess={handleIntakeSuccess}
      />
    </>
  );
}
