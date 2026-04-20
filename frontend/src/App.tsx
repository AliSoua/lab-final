// src/App.tsx
import { Routes, Route, Navigate } from "react-router-dom"
import { useAuth } from "@/hooks/useAuth"
import { AppLayout } from "@/components/layout/AppLayout"
import { PublicLayout } from "@/components/layout/PublicLayout"

import LoginPage from "@/pages/LoginPage"
import CatalogPage from "@/pages/LabDefinition/catalogue/index"
import ListLabDefinitionsPage from "@/pages/LabDefinition/ListLabDefinitionsPage"
import CreateSimpleLabDefinitionsPage from "@/pages/LabDefinition/CreateSimpleLabDefinitionsPage"
import CreateFullLabDefinitionsPage from "@/pages/LabDefinition/CreateFullLabDefinitionsPage"
import LabDetailPage from "@/pages/LabDefinition/detail/index"
import { ProfilePage } from "@/pages/profile/ProfilePage"

// Infrastructure
import InfrastructurePage from "@/pages/infrastructure/InfrastructurePage"
// Credentials Vault
import ModeratorCredentialsPage from "@/pages/credentials/ModeratorCredentialsPage"
import AdminCredentialsPage from "@/pages/credentials/AdminCredentialsPage"

// Lab Guide
import ListGuidePage from "@/pages/LabGuide/ListGuidePage"
import CreateGuidePage from "@/pages/LabGuide/CreateGuidePage"
import PreviewGuidePage from "@/pages/LabGuide/PreviewGuidePage"


import { Loader2 } from "lucide-react"

// ── Route guards ────────────────────────────────────────────────────────────────

function AdminRouteGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth()

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#1ca9b1]" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // Only admin and moderator can access admin routes
  if (user?.role !== "admin" && user?.role !== "moderator") {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

/**
 * Guard for authenticated routes (any logged-in user: trainee, moderator, admin)
 */
function AuthenticatedRouteGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#1ca9b1]" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

function RoleBasedRedirect() {
  const { isAuthenticated, isLoading, user } = useAuth()

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#1ca9b1]" />
      </div>
    )
  }

  // If not authenticated, show public catalog
  if (!isAuthenticated) {
    return <CatalogPage />
  }

  // If admin or moderator, redirect to lab definitions management
  if (user?.role === "admin" || user?.role === "moderator") {
    return <Navigate to="/admin/lab-definitions" replace />
  }

  // Regular users see catalog
  return <CatalogPage />
}

// ── Root component ─────────────────────────────────────────────────────────────

function App() {
  const { user, logout } = useAuth()

  return (
    <Routes>
      {/* Login */}
      <Route path="/login" element={<LoginPage />} />

      {/* PUBLIC ROUTES */}
      <Route
        path="/"
        element={<PublicLayout user={user || undefined} onLogout={logout} />}
      >
        <Route index element={<RoleBasedRedirect />} />
        {/* Public catalog is accessible to all */}
        <Route path="catalog" element={<CatalogPage />} />
        <Route
          path="labs/:slug"
          element={
            <AuthenticatedRouteGuard>
              <LabDetailPage />
            </AuthenticatedRouteGuard>
          }
        />
        {/* PROFILE - Accessible to any authenticated user */}
        <Route
          path="profile"
          element={
            <AuthenticatedRouteGuard>
              <ProfilePage />
            </AuthenticatedRouteGuard>
          }
        />

      </Route>

      {/* ADMIN/MODERATOR ROUTES - Private Layout with Sidebar */}
      <Route
        path="/admin"
        element={
          <AdminRouteGuard>
            <AppLayout user={user || undefined} onLogout={logout} />
          </AdminRouteGuard>
        }
      >
        {/* Lab Definitions Management */}
        <Route index element={<Navigate to="/admin/lab-definitions" replace />} />
        <Route path="lab-definitions" element={<ListLabDefinitionsPage />} />
        <Route path="lab-definitions/create-simple" element={<CreateSimpleLabDefinitionsPage />} />
        <Route path="lab-definitions/create-full" element={<CreateFullLabDefinitionsPage />} />

        {/* Infrastructure */}
        <Route path="infrastructure" element={<InfrastructurePage />} />

        {/* Credentials */}
        <Route path="credentials" element={<ModeratorCredentialsPage />} />
        <Route path="vcenter-credentials" element={<AdminCredentialsPage />} />

        {/* Lab Guide */}
        <Route path="lab-guides" element={<ListGuidePage />} />
        <Route path="lab-guides/create" element={<CreateGuidePage />} />
        <Route path="lab-guides/:guideId/preview" element={<PreviewGuidePage />} />
      </Route>

      {/* Catch all - redirect to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App