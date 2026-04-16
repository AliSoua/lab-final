import { Bell, Search, Menu, User, LogOut, Settings, ChevronDown, FlaskConical } from "lucide-react"
import { Link, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

interface HeaderProps {
  onMenuToggle: () => void
  user?: {
    name: string
    email: string
    role: string
    avatar?: string
  }
  onLogout?: () => void
}

// Role badge colors — teal-aligned palette
const roleBadgeClass: Record<string, string> = {
  admin: "bg-[#f0fafa] text-[#0d7a80] border border-[#1ca9b1]/30",
  moderator: "bg-amber-50 text-amber-700 border border-amber-200",
  trainee: "bg-slate-50 text-[#727373] border border-slate-200",
}

export function Header({ onMenuToggle, user, onLogout }: HeaderProps) {
  const initials = user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) ?? "U"

  // Check if user is admin or moderator (hide logo and search for these roles)
  const isStaff = user?.role === "admin" || user?.role === "moderator"
  const showLogoAndSearch = !isStaff
  const navigate = useNavigate()

  return (
    <header className="flex-none h-16 border-b border-[#ebebeb] bg-white font-['Inter','Helvetica_Neue',Arial,sans-serif]">
      <div className={cn(
        "flex h-full items-center gap-4 px-4 md:px-6",
        showLogoAndSearch ? "justify-between" : "justify-end"
      )}>

        {/* LEFT SECTION: Logo + Mobile Toggle (hidden for admin/moderator) */}
        {showLogoAndSearch ? (
          <div className="flex items-center gap-3 shrink-0">
            {/* Mobile menu toggle */}
            <button
              onClick={onMenuToggle}
              className="md:hidden flex h-9 w-9 items-center justify-center rounded-lg text-[#727373] transition-colors hover:bg-[#f5f5f5] hover:text-[#3a3a3a]"
              aria-label="Toggle menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1ca9b1]">
                <FlaskConical className="h-4 w-4 text-white" />
              </div>
              <div className="hidden md:flex flex-col leading-none">
                <span className="text-[14px] font-semibold tracking-tight text-[#3a3a3a]">
                  Lab Orchestration
                </span>
                <span className="text-[10.5px] font-medium tracking-wide text-[#727373] uppercase">
                  Training Platform
                </span>
              </div>
            </Link>
          </div>
        ) : (
          /* For admin/moderator: Only show mobile toggle on left */
          <div className="flex items-center gap-3 shrink-0 md:hidden">
            <button
              onClick={onMenuToggle}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-[#727373] transition-colors hover:bg-[#f5f5f5] hover:text-[#3a3a3a]"
              aria-label="Toggle menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* CENTER SECTION: Search (only for trainees and guests) */}
        {showLogoAndSearch && (
          <div className="flex-1 flex justify-center px-4">
            <div className="w-full max-w-md relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-[15px] w-[15px] text-[#c4c4c4] transition-colors group-focus-within:text-[#1ca9b1]" />
              <input
                type="search"
                placeholder="Search labs, guides, resources…"
                className={cn(
                  "h-9 w-full rounded-lg border border-[#e8e8e8] bg-[#fafafa]",
                  "pl-9 pr-10 text-[13px] text-[#3a3a3a] placeholder:text-[#c4c4c4]",
                  "outline-none transition-all duration-200",
                  "focus:border-[#1ca9b1] focus:bg-white focus:ring-2 focus:ring-[#1ca9b1]/15"
                )}
              />
              <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 hidden lg:inline-flex h-5 items-center rounded border border-[#e8e8e8] bg-white px-1.5 font-mono text-[10px] text-[#c4c4c4]">
                ⌘K
              </kbd>
            </div>
          </div>
        )}

        {/* RIGHT SECTION: Actions (always visible) */}
        <div className="flex items-center gap-2 shrink-0">

          {/* Authenticated: avatar dropdown */}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-[#f5f5f5] outline-none">
                  <Avatar className="h-7 w-7 border border-[#e8e8e8]">
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback className="bg-[#f0fafa] text-[#1ca9b1] text-[11px] font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden sm:flex flex-col items-start leading-none gap-0.5">
                    <span className="text-[13px] font-semibold text-[#3a3a3a]">
                      {user.name}
                    </span>
                    <span className="text-[10.5px] capitalize text-[#727373]">
                      {user.role}
                    </span>
                  </div>
                  <ChevronDown className="hidden sm:block h-3.5 w-3.5 text-[#c4c4c4]" />
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                className="w-60 border-[#ebebeb] shadow-[0_4px_20px_rgba(0,0,0,0.06)] rounded-xl p-0 overflow-hidden"
                align="end"
                sideOffset={8}
              >
                {/* User info header */}
                <DropdownMenuLabel className="p-4 pb-3 font-normal">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9 border border-[#e8e8e8]">
                      <AvatarImage src={user.avatar} alt={user.name} />
                      <AvatarFallback className="bg-[#f0fafa] text-[#1ca9b1] text-[12px] font-semibold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <p className="text-[13px] font-semibold text-[#3a3a3a] truncate">
                        {user.name}
                      </p>
                      <p className="text-[11.5px] text-[#727373] truncate">
                        {user.email}
                      </p>
                      <span
                        className={cn(
                          "mt-1 inline-flex w-fit rounded-md px-2 py-0.5 text-[10.5px] font-semibold capitalize",
                          roleBadgeClass[user.role] ?? roleBadgeClass.trainee
                        )}
                      >
                        {user.role}
                      </span>
                    </div>
                  </div>
                </DropdownMenuLabel>

                <DropdownMenuSeparator className="bg-[#f0f0f0] mx-0 my-0" />

                <div className="p-1.5">
                  <DropdownMenuItem
                    onClick={() => navigate("/profile")}
                    className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-[#3a3a3a] cursor-pointer focus:bg-[#f5f5f5] focus:text-[#3a3a3a]"
                  >
                    <User className="h-[15px] w-[15px] text-[#727373]" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-[#3a3a3a] cursor-pointer focus:bg-[#f5f5f5] focus:text-[#3a3a3a]">
                    <Settings className="h-[15px] w-[15px] text-[#727373]" />
                    Settings
                  </DropdownMenuItem>
                </div>

                <DropdownMenuSeparator className="bg-[#f0f0f0] mx-0 my-0" />

                <div className="p-1.5">
                  <DropdownMenuItem
                    onClick={onLogout}
                    className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-[#e05252] cursor-pointer focus:bg-red-50 focus:text-[#e05252]"
                  >
                    <LogOut className="h-[15px] w-[15px]" />
                    Log out
                  </DropdownMenuItem>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

          ) : (
            /* Guest: Sign in button */
            <Link to="/login">
              <button
                className={cn(
                  "flex h-9 items-center gap-1.5 rounded-lg px-4",
                  "bg-[#1ca9b1] text-[13px] font-semibold text-white",
                  "transition-colors duration-200 hover:bg-[#17959c]"
                )}
              >
                Sign in
              </button>
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}