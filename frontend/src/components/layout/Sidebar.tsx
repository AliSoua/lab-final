// src/components/layout/Sidebar.tsx
import { NavLink, useLocation } from "react-router-dom"
import { cn } from "@/lib/utils"
import { FlaskConical, ChevronRight } from "lucide-react"

interface SidebarProps {
  userRole?: string
}

export function Sidebar({ userRole }: SidebarProps) {
  const location = useLocation()
  const isActive = location.pathname.startsWith("/admin/lab-definitions")

  return (
    <aside className="flex h-full w-60 flex-col bg-white border-r border-slate-200">
      {/* Header - Logo matching Header.tsx */}
      <div className="flex h-16 items-center px-5 border-b border-slate-200 shrink-0">
        <NavLink to="/admin/lab-definitions" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1ca9b1]">
            <FlaskConical className="h-4 w-4 text-white" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-[14px] font-semibold tracking-tight text-slate-800">
              Lab Orchestration
            </span>
            <span className="text-[10.5px] font-medium tracking-wide text-slate-500 uppercase">
              Training Platform
            </span>
          </div>
        </NavLink>
      </div>

      {/* Navigation - Clean slate design */}
      <div className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          <NavLink
            to="/admin/lab-definitions"
            className={({ isActive }) =>
              cn(
                "group flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-slate-100 text-slate-900"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )
            }
          >
            <div className="flex items-center gap-3">
              <span className={cn(
                "text-xs font-semibold uppercase tracking-wider transition-colors",
                isActive ? "text-sky-600" : "text-slate-400 group-hover:text-slate-600"
              )}>
                Lab Management
              </span>
            </div>
            {isActive && (
              <ChevronRight className="h-4 w-4 text-sky-500" />
            )}
          </NavLink>

          {/* Subtle underline indicator when active */}
          <div className={cn(
            "mx-3 h-0.5 rounded-full transition-all duration-200",
            isActive ? "bg-sky-500 w-12" : "bg-transparent w-0"
          )} />
        </nav>
      </div>

      {/* Bottom - Clean role indicator */}
      <div className="px-4 py-4 border-t border-slate-200 bg-slate-50/50">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[11px] font-medium text-slate-600 capitalize">
              {userRole || "User"}
            </span>
            <span className="text-[10px] text-slate-400">
              Admin Console
            </span>
          </div>
          <span className="h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-emerald-100" />
        </div>
      </div>
    </aside>
  )
}