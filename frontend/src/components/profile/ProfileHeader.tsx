// src/components/profile/ProfileHeader.tsx
import { Camera, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { UserProfile } from "@/types/profile/user"

interface ProfileHeaderProps {
    profile: UserProfile
    isEditing: boolean
}

// Role badge colors - matches Header.tsx
const roleBadgeClass: Record<string, string> = {
    admin: "bg-[#f0fafa] text-[#0d7a80] border-[#1ca9b1]/30",
    moderator: "bg-amber-50 text-amber-700 border-amber-200",
    trainee: "bg-slate-50 text-[#727373] border-slate-200",
}

const skillLevelColors: Record<string, string> = {
    beginner: "bg-sky-100 text-sky-700 border-sky-200",
    intermediate: "bg-violet-100 text-violet-700 border-violet-200",
    advanced: "bg-rose-100 text-rose-700 border-rose-200",
}

function getInitials(profile: UserProfile): string {
    if (profile.first_name && profile.last_name) {
        return `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase()
    }
    return profile.username.slice(0, 2).toUpperCase()
}

function getDisplayName(profile: UserProfile): string {
    if (profile.first_name && profile.last_name) {
        return `${profile.first_name} ${profile.last_name}`
    }
    return profile.username
}

export function ProfileHeader({ profile, isEditing }: ProfileHeaderProps) {
    const initials = getInitials(profile)
    const displayName = getDisplayName(profile)

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-[#ebebeb] p-6 mb-6">
            <div className="flex flex-col sm:flex-row items-start gap-6">
                {/* Avatar */}
                <div className="relative shrink-0">
                    <div className="h-32 w-32 rounded-full border-4 border-white shadow-lg bg-gradient-to-br from-[#1ca9b1] to-[#0d8f96] flex items-center justify-center">
                        {profile.avatar_url ? (
                            <img
                                src={profile.avatar_url}
                                alt={displayName}
                                className="h-full w-full rounded-full object-cover"
                            />
                        ) : (
                            <span className="text-3xl font-semibold text-white">{initials}</span>
                        )}
                    </div>
                    {isEditing && (
                        <button className="absolute -bottom-1 -right-1 h-9 w-9 rounded-full bg-[#1ca9b1] text-white flex items-center justify-center shadow-md hover:bg-[#17959c] transition-colors">
                            <Camera className="h-4 w-4" />
                        </button>
                    )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                            <h1 className="text-[1.75rem] font-bold tracking-tight text-[#3a3a3a]">
                                {displayName}
                            </h1>
                            <p className="text-[14px] text-[#727373] mt-0.5">{profile.email}</p>

                            <div className="flex flex-wrap items-center gap-2 mt-3">
                                <span
                                    className={cn(
                                        "inline-flex items-center rounded-md border px-2.5 py-0.5 text-[11px] font-semibold capitalize",
                                        roleBadgeClass[profile.role]
                                    )}
                                >
                                    {profile.role}
                                </span>
                                <span
                                    className={cn(
                                        "inline-flex items-center rounded-md border px-2.5 py-0.5 text-[11px] font-semibold capitalize",
                                        skillLevelColors[profile.skill_level]
                                    )}
                                >
                                    {profile.skill_level}
                                </span>
                                {profile.is_active && (
                                    <span className="inline-flex items-center rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-semibold">
                                        <CheckCircle2 className="h-3 w-3 mr-1" />
                                        Active
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Join date */}
                    <div className="flex items-center gap-2 mt-4 text-[12px] text-[#727373]">
                        <span>Member since {new Date(profile.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })}</span>
                    </div>
                </div>
            </div>
        </div>
    )
}