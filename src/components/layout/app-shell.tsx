"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BrainCircuit,
  Bug,
  Cable,
  FileText,
  Github,
  Layers3,
  LayoutDashboard,
  Lightbulb,
  Settings,
  ShieldAlert,
  Wrench,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/codebase", label: "Codebase Analysis", icon: Layers3 },
  { href: "/ask", label: "Ask / Council", icon: BrainCircuit },
  { href: "/architecture", label: "Architecture", icon: Cable },
  { href: "/debate", label: "Debate", icon: Activity },
  { href: "/exports", label: "Exports", icon: FileText },
  { href: "/security", label: "Security", icon: ShieldAlert },
  { href: "/gaps", label: "Gaps", icon: Bug },
  { href: "/features", label: "Features", icon: Lightbulb },
  { href: "/patches", label: "Patches", icon: Wrench },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname === "/") {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.15),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(59,130,246,0.15),_transparent_24%),linear-gradient(180deg,_#020617_0%,_#0f172a_55%,_#020617_100%)]">
      <div className="mx-auto grid min-h-screen max-w-[1600px] grid-cols-[280px_1fr] gap-6 px-4 py-4 lg:px-6">
        <aside className="sticky top-4 flex h-[calc(100vh-2rem)] flex-col rounded-[28px] border border-white/10 bg-slate-950/70 p-5 backdrop-blur-sm">
          <div className="mb-8 flex items-center justify-between">
            <Link href="/" className="space-y-1">
              <p className="text-xs uppercase tracking-[0.35em] text-cyan-300/80">
                RepoCouncil
              </p>
              <p className="text-lg font-semibold text-white">Council Workspace</p>
            </Link>
            <Badge variant="secondary">Dual Mode</Badge>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-300 transition hover:bg-white/5 hover:text-white",
                    isActive && "bg-cyan-400 text-slate-950 shadow-[0_0_32px_rgba(34,211,238,0.15)]",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-white">
              <Github className="h-4 w-4 text-cyan-300" />
              Product posture
            </div>
            <p className="text-sm text-slate-400">
              Codebase analysis and Ask Mode sessions are durable in Postgres deployments and demo-backed otherwise.
            </p>
          </div>
        </aside>
        <main className="min-w-0 py-2">{children}</main>
      </div>
    </div>
  );
}
