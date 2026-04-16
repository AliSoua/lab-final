// src/components/layout/PublicLayout.tsx
import { Outlet } from "react-router-dom"
import { Header } from "./Header"

// Match the actual User type from useAuth hook
interface User {
    username: string
    email: string
    role: "trainee" | "moderator" | "admin"
    first_name?: string
    last_name?: string
    avatar?: string
}

interface PublicLayoutProps {
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

export function PublicLayout({ user, onLogout }: PublicLayoutProps) {
    // Public layout doesn't have a sidebar, so onMenuToggle is a no-op
    const handleMenuToggle = () => {
        // No sidebar to toggle in public layout
    }

    // Transform user to Header expected format
    const headerUser = user ? {
        name: getUserDisplayName(user),
        email: user.email,
        role: user.role,
        avatar: user.avatar
    } : undefined

    return (
        <div className="flex h-screen w-full flex-col bg-background">
            {/* Header only */}
            <Header
                user={headerUser}
                onLogout={onLogout}
                onMenuToggle={handleMenuToggle}
            />

            {/* Page content */}
            <main className="flex-1 overflow-auto">
                <Outlet />
            </main>
        </div>
    )
}