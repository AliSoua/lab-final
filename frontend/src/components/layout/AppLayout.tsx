// src/components/layout/AppLayout.tsx
import { useState } from "react"
import { Outlet } from "react-router-dom"
import { Header } from "./Header"
import { Sidebar } from "./Sidebar"

// Match the actual User type from useAuth hook
interface User {
  username: string
  email: string
  role: "trainee" | "moderator" | "admin"
  first_name?: string
  last_name?: string
  avatar?: string
}

interface AppLayoutProps {
  user?: User
  onLogout?: () => void
}

// Helper to get display name from user
function getUserDisplayName(user: User): string {
  if (user.first_name && user.last_name) {
    return `${user.first_name} ${user.last_name}`
  }
  return user.username
}

export function AppLayout({ user, onLogout }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  // Transform user to Header expected format (adds name property)
  const headerUser = user ? {
    name: getUserDisplayName(user),
    email: user.email,
    role: user.role,
    avatar: user.avatar
  } : undefined

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <Sidebar userRole={user?.role} />

      <div className="flex flex-1 flex-col min-w-0">
        <Header
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
          user={headerUser}
          onLogout={onLogout}
        />
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}