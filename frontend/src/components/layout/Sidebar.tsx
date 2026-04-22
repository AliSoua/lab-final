// src/components/layout/Sidebar.tsx
import { NavLink, useLocation } from "react-router-dom"
import { cn } from "@/lib/utils"
import { FlaskConical, ChevronRight, Shield } from "lucide-react"

interface SidebarProps {
  userRole?: string
}

interface NavItem {
  to: string
  label: string
  adminOnly?: boolean
}

const allNavItems: NavItem[] = [
  { to: "/admin/lab-definitions", label: "Lab Management" },
  { to: "/admin/infrastructure", label: "Infrastructure" },
  { to: "/admin/credentials", label: "Host Credentials" },
  { to: "/admin/vcenter-credentials", label: "vCenter Credentials", adminOnly: true },
  { to: "/admin/lab-guides", label: "Lab Guides" },
  { to: "/admin/lab-connections", label: "Lab Connections" },
]

export function Sidebar({ userRole }: SidebarProps) {
  const location = useLocation()

  const navItems = allNavItems.filter(
    (item) => !item.adminOnly || userRole === "admin"
  )

  return (
    <aside className="flex h-full w-60 flex-col bg-white border-r border-[#e8e8e8]">
      {/* Header - Logo matching Header.tsx */}
      <div className="flex h-16 items-center px-5 border-b border-[#e8e8e8] shrink-0">
        <NavLink to="/admin/lab-definitions" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1ca9b1]">
            <FlaskConical className="h-4 w-4 text-white" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-[14px] font-semibold tracking-tight text-[#3a3a3a]">
              Lab Orchestration
            </span>
            <span className="text-[10.5px] font-medium tracking-wide text-[#727373] uppercase">
              Training Platform
            </span>
          </div>
        </NavLink>
      </div>

      {/* Navigation - Clean minimal design */}
      <div className="flex-1 px-3 py-4">
        <nav className="space-y-3">
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.to)

            return (
              <div key={item.to}>
                <NavLink
                  to={item.to}
                  className={cn(
                    "group flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-[#f5f5f5] text-[#3a3a3a]"
                      : "text-[#727373] hover:bg-[#f9f9f9] hover:text-[#3a3a3a]"
                  )}
                >
                  <span className={cn(
                    "text-xs font-semibold uppercase tracking-wider transition-colors",
                    isActive ? "text-[#1ca9b1]" : "text-[#727373] group-hover:text-[#3a3a3a]"
                  )}>
                    {item.label}
                  </span>
                  {isActive && (
                    <ChevronRight className="h-4 w-4 text-[#1ca9b1]" />
                  )}
                </NavLink>

                {/* Teal underline indicator when active */}
                <div className={cn(
                  "mx-3 h-0.5 rounded-full transition-all duration-300",
                  isActive ? "bg-[#1ca9b1] w-12" : "bg-transparent w-0"
                )} />
              </div>
            )
          })}
        </nav>
      </div>

      {/* Bottom - Clean role indicator */}
      <div className="px-4 py-4 border-t border-[#e8e8e8] bg-[#f9f9f9]/50">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[11px] font-medium text-[#727373] capitalize">
              {userRole || "User"}
            </span>
            <span className="text-[10px] text-[#c4c4c4]">
              Admin Console
            </span>
          </div>
          <span className="h-2 w-2 rounded-full bg-[#1ca9b1] ring-2 ring-[#1ca9b1]/20" />
        </div>
      </div>
    </aside>
  )
}