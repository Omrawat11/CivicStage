"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Building2, LayoutDashboard, ListFilter, ShieldCheck, BarChart3, Award, Menu, X } from "lucide-react";

const navItems = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard", match: (p: string) => p === "/" },
  { href: "/complaints", icon: ListFilter, label: "Queue", match: (p: string) => p.startsWith("/complaints") },
  { href: "/reports", icon: BarChart3, label: "Reports", match: (p: string) => p.startsWith("/reports") },
  { href: "/evaluation", icon: Award, label: "Evaluation", match: (p: string) => p.startsWith("/evaluation") },
];

export default function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border-subtle)]" style={{
      background: 'linear-gradient(180deg, rgba(5, 10, 20, 0.95) 0%, rgba(5, 10, 20, 0.88) 100%)',
      backdropFilter: 'blur(16px) saturate(1.5)',
      WebkitBackdropFilter: 'blur(16px) saturate(1.5)',
    }}>
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white transition-all duration-300 group-hover:shadow-[0_0_20px_rgba(59,130,246,0.3)]"
                  style={{
                    background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                    boxShadow: '0 2px 12px rgba(59,130,246,0.25)',
                  }}>
                  <Building2 className="w-[18px] h-[18px]" />
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[var(--background)]"></div>
              </div>
              <div className="hidden sm:block">
                <div className="flex items-center gap-2">
                  <span className="font-bold tracking-tight text-white text-[15px]">CivicStage</span>
                  <span className="px-1.5 py-[2px] text-[9px] uppercase font-bold tracking-widest rounded-md text-blue-300/80"
                    style={{
                      background: 'linear-gradient(135deg, rgba(59,130,246,0.15) 0%, rgba(59,130,246,0.08) 100%)',
                      border: '1px solid rgba(59,130,246,0.2)',
                    }}>
                    v4.0
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 font-medium tracking-wide">Bhopal Municipal Intelligence</p>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map(({ href, icon: Icon, label, match }) => {
              const isActive = match(pathname);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`relative flex items-center gap-2 px-3.5 py-2 rounded-lg text-[13px] font-medium transition-all duration-200 ${
                    isActive
                      ? "text-white"
                      : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]"
                  }`}
                >
                  {isActive && (
                    <div className="absolute inset-0 rounded-lg"
                      style={{
                        background: 'linear-gradient(135deg, rgba(59,130,246,0.12) 0%, rgba(59,130,246,0.06) 100%)',
                        border: '1px solid rgba(59,130,246,0.18)',
                      }}
                    />
                  )}
                  <Icon className={`w-4 h-4 relative z-10 ${isActive ? 'text-blue-400' : ''}`} />
                  <span className="relative z-10">{label}</span>
                  {isActive && (
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-[2px] rounded-full bg-blue-500" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Right Section */}
          <div className="hidden md:flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs"
              style={{
                background: 'linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(16,185,129,0.04) 100%)',
                border: '1px solid rgba(16,185,129,0.15)',
              }}>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-50"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-emerald-400/90 font-medium">Online</span>
            </div>
            <div className="h-5 w-px bg-[var(--border-subtle)]"></div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400/60" />
              <span className="font-medium">Human-in-the-Loop</span>
            </div>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.05] transition-colors"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileOpen && (
          <div className="md:hidden py-3 border-t border-[var(--border-subtle)] space-y-1">
            {navItems.map(({ href, icon: Icon, label, match }) => {
              const isActive = match(pathname);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "text-white bg-blue-500/10 border border-blue-500/20"
                      : "text-slate-400 hover:text-white hover:bg-white/[0.03]"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : ''}`} />
                  <span>{label}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </header>
  );
}
