// src/pages/profile/ProfilePage.tsx
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { X, AlertCircle, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"
import { ProfileHeader, ProfileForm, StatsCard } from "@/components/profile"
import { useProfile } from "@/hooks/profile/useProfile"
import type { UpdateProfileRequest } from "@/types/profile/user"

export function ProfilePage() {
    const navigate = useNavigate()
    const {
        profile,
        stats,
        isLoading,
        isUpdating,
        error,
        fetchProfile,
        fetchStats,
        updateProfile,
        syncProfile,
        resetError,
    } = useProfile()

    const [isEditing, setIsEditing] = useState(false)

    // Fetch profile on mount
    useEffect(() => {
        fetchProfile().catch(() => {
            // Error is handled in hook
        })
        fetchStats().catch(() => {
            // Error is handled in hook
        })
    }, [fetchProfile, fetchStats])

    const handleSave = async (data: UpdateProfileRequest) => {
        try {
            await updateProfile(data)
            setIsEditing(false)
        } catch {
            // Error is handled in hook
        }
    }

    const handleCancel = () => {
        setIsEditing(false)
        resetError()
    }

    const handleSync = async () => {
        try {
            await syncProfile()
        } catch {
            // Error is handled in hook
        }
    }

    if (isLoading && !profile) {
        return (
            <div className="min-h-screen bg-[#fafafa]">
                {/* Hero skeleton */}
                <div
                    className="h-48"
                    style={{
                        background: "linear-gradient(160deg, #0d8f96 0%, #1ca9b1 55%, #2ec4cc 100%)",
                    }}
                />
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16">
                    <div className="bg-white rounded-2xl shadow-sm border border-[#ebebeb] p-6 mb-6 animate-pulse">
                        <div className="flex items-start gap-6">
                            <div className="h-32 w-32 rounded-full bg-slate-200" />
                            <div className="flex-1 space-y-4">
                                <div className="h-8 w-64 bg-slate-200 rounded" />
                                <div className="h-4 w-48 bg-slate-200 rounded" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    if (!profile && error) {
        return (
            <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
                <div className="bg-white rounded-xl border border-[#ebebeb] p-8 max-w-md w-full mx-4 text-center">
                    <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-[#3a3a3a] mb-2">Failed to load profile</h3>
                    <p className="text-[13px] text-[#727373] mb-4">{error}</p>
                    <div className="flex gap-3 justify-center">
                        <button
                            onClick={() => fetchProfile()}
                            className="px-4 py-2 bg-[#1ca9b1] text-white rounded-lg text-[13px] font-medium hover:bg-[#17959c] transition-colors"
                        >
                            Try Again
                        </button>
                        <button
                            onClick={() => navigate("/")}
                            className="px-4 py-2 border border-[#e8e8e8] text-[#3a3a3a] rounded-lg text-[13px] font-medium hover:bg-[#f5f5f5] transition-colors"
                        >
                            Go Home
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    if (!profile) return null

    return (
        <div className="min-h-screen bg-[#fafafa] font-['Inter','Helvetica_Neue',Arial,sans-serif]">
            {/* Hero Section */}
            <div
                className="relative h-48 overflow-hidden"
                style={{
                    background: "linear-gradient(160deg, #0d8f96 0%, #1ca9b1 55%, #2ec4cc 100%)",
                }}
            >
                {/* Decorative circles */}
                <div className="pointer-events-none absolute -right-20 -top-20 h-[280px] w-[280px] rounded-full border border-white/10" />
                <div className="pointer-events-none absolute -right-10 -top-10 h-[180px] w-[180px] rounded-full border border-white/[0.08]" />
                <div className="pointer-events-none absolute bottom-10 left-10 h-[200px] w-[200px] rounded-full border border-white/[0.06]" />

                {/* Back button */}
                <div className="absolute top-4 left-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                    >
                        <X className="h-4 w-4 rotate-90" />
                        Back
                    </button>
                </div>

                {/* Sync button */}
                <div className="absolute top-4 right-4">
                    <button
                        onClick={handleSync}
                        disabled={isLoading}
                        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] text-white/80 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50"
                    >
                        <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                        Sync
                    </button>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 pb-12">
                {/* Error Banner */}
                {error && (
                    <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
                        <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
                        <p className="text-[13px] text-red-700 flex-1">{error}</p>
                        <button
                            onClick={resetError}
                            className="text-[13px] text-red-600 hover:text-red-800 font-medium"
                        >
                            Dismiss
                        </button>
                    </div>
                )}

                {/* Profile Header */}
                <ProfileHeader profile={profile} isEditing={isEditing} />

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column */}
                    <div className="lg:col-span-2 space-y-6">
                        <ProfileForm
                            profile={profile}
                            isEditing={isEditing}
                            isUpdating={isUpdating}
                            onSave={handleSave}
                            onCancel={handleCancel}
                            onEdit={() => setIsEditing(true)}
                        />
                    </div>

                    {/* Right Column */}
                    <div className="space-y-6">
                        <StatsCard stats={stats} isLoading={isLoading} />

                        {/* Quick Actions */}
                        <div className="bg-white rounded-xl border border-[#ebebeb] p-6">
                            <h3 className="text-[14px] font-semibold text-[#3a3a3a] mb-4">Quick Actions</h3>
                            <div className="space-y-2">
                                <button
                                    onClick={() => navigate("/")}
                                    className="w-full flex items-center gap-3 p-3 rounded-lg text-[13px] text-[#3a3a3a] hover:bg-[#f5f5f5] transition-colors text-left"
                                >
                                    <span className="h-8 w-8 rounded-lg bg-[#f0fafa] flex items-center justify-center text-[#1ca9b1]">
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                                        </svg>
                                    </span>
                                    Browse Labs
                                </button>
                                <button
                                    onClick={() => navigate("/settings")}
                                    className="w-full flex items-center gap-3 p-3 rounded-lg text-[13px] text-[#3a3a3a] hover:bg-[#f5f5f5] transition-colors text-left"
                                >
                                    <span className="h-8 w-8 rounded-lg bg-slate-50 flex items-center justify-center text-[#727373]">
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                    </span>
                                    Account Settings
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}