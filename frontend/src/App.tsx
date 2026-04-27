// src/App.tsx
import { Routes, Route, Navigate } from "react-router-dom"
import { useAuth } from "@/hooks/useAuth"
import { AppLayout } from "@/components/layout/AppLayout"
import { PublicLayout } from "@/components/layout/PublicLayout"

import LoginPage from "@/pages/LoginPage"
import CatalogPage from "@/pages/LabDefinition/catalogue/index"
import ListLabDefinitionsPage from "@/pages/LabDefinition/ListLabDefinitionsPage"
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

// Lab Connection
import LabConnectionPage from "@/pages/LabDefinition/LabConnectionPage"

// Lab Instances
import LabInstanceListPage from "@/pages/LabInstance/list/index"
import LabInstanceDetailPage from "@/pages/LabInstance/detail/index"
import RunLabPage from "@/pages/LabInstance/run/RunLabPage"

// Instances (Admin)
import ListLabInstancePage from "@/pages/LabInstance/admin/ListLabInstancePage"
import ViewLabInstancePage from "@/pages/LabInstance/admin/ViewLabInstancePage"

import TestGuacamolePage from "@/pages/TestGuacamolePage"

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

  if (user?.role !== "admin" && user?.role !== "moderator") {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

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

/**
 * Guard for trainee-only routes.
 * Authenticated users who are NOT trainees (admins, moderators) are redirected.
 */
function TraineeRouteGuard({ children }: { children: React.ReactNode }) {
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

  // Only trainees may access this route
  if (user?.role !== "trainee") {
    return <Navigate to="/admin/lab-definitions" replace />
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

  if (!isAuthenticated) {
    return <CatalogPage />
  }

  if (user?.role === "admin" || user?.role === "moderator") {
    return <Navigate to="/admin/lab-definitions" replace />
  }

  return <CatalogPage />
}

// ── Root component ─────────────────────────────────────────────────────────────

function App() {
  const { user, logout } = useAuth()

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      {/* PUBLIC ROUTES */}
      <Route
        path="/"
        element={<PublicLayout user={user || undefined} onLogout={logout} />}
      >
        <Route index element={<RoleBasedRedirect />} />
        <Route path="catalog" element={<CatalogPage />} />

        {/* Lab Instances — TRAINEE ONLY */}
        <Route
          path="lab-instances"
          element={
            <TraineeRouteGuard>
              <LabInstanceListPage />
            </TraineeRouteGuard>
          }
        />
        <Route
          path="lab-instances/:instanceId"
          element={
            <TraineeRouteGuard>
              <LabInstanceDetailPage />
            </TraineeRouteGuard>
          }
        />
        <Route
          path="lab-instances/:instanceId/run"
          element={
            <TraineeRouteGuard>
              <RunLabPage />
            </TraineeRouteGuard>
          }
        />

        {/* Other authenticated routes (any role) */}
        <Route
          path="test-guacamole"
          element={
            <AuthenticatedRouteGuard>
              <TestGuacamolePage />
            </AuthenticatedRouteGuard>
          }
        />
        <Route
          path="labs/:slug"
          element={
            <AuthenticatedRouteGuard>
              <LabDetailPage />
            </AuthenticatedRouteGuard>
          }
        />
        <Route
          path="profile"
          element={
            <AuthenticatedRouteGuard>
              <ProfilePage />
            </AuthenticatedRouteGuard>
          }
        />
      </Route>

      {/* ADMIN/MODERATOR ROUTES */}
      <Route
        path="/admin"
        element={
          <AdminRouteGuard>
            <AppLayout user={user || undefined} onLogout={logout} />
          </AdminRouteGuard>
        }
      >
        <Route index element={<Navigate to="/admin/lab-definitions" replace />} />
        <Route path="lab-definitions" element={<ListLabDefinitionsPage />} />
        <Route path="lab-definitions/create-full" element={<CreateFullLabDefinitionsPage />} />
        <Route path="infrastructure" element={<InfrastructurePage />} />
        <Route path="credentials" element={<ModeratorCredentialsPage />} />
        <Route path="vcenter-credentials" element={<AdminCredentialsPage />} />
        <Route path="lab-guides" element={<ListGuidePage />} />
        <Route path="lab-guides/create" element={<CreateGuidePage />} />
        <Route path="lab-guides/:guideId/preview" element={<PreviewGuidePage />} />
        <Route path="lab-connections" element={<LabConnectionPage />} />

        {/* Instances (Admin) */}
        <Route path="instances" element={<ListLabInstancePage />} />
        <Route path="instances/:instanceId" element={<ViewLabInstancePage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App