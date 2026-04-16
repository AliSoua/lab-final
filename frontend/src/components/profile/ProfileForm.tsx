// src/components/profile/ProfileForm.tsx
import { useState, useEffect } from "react"
import { Briefcase, Building2, Phone, Globe, User, Save, X } from "lucide-react"
import { cn } from "@/lib/utils"
import type { UserProfile, UpdateProfileRequest } from "@/types/profile/user"

interface ProfileFormProps {
    profile: UserProfile
    isEditing: boolean
    isUpdating: boolean
    onSave: (data: UpdateProfileRequest) => Promise<void>
    onCancel: () => void
    onEdit: () => void
}

export function ProfileForm({
    profile,
    isEditing,
    isUpdating,
    onSave,
    onCancel,
    onEdit,
}: ProfileFormProps) {
    const [formData, setFormData] = useState<UpdateProfileRequest>({
        bio: "",
        job_title: "",
        department: "",
        phone: "",
        timezone: "UTC",
    })

    // Initialize form when editing starts
    useEffect(() => {
        if (isEditing) {
            setFormData({
                bio: profile.bio || "",
                job_title: profile.job_title || "",
                department: profile.department || "",
                phone: profile.phone || "",
                timezone: profile.timezone || "UTC",
            })
        }
    }, [isEditing, profile])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        await onSave(formData)
    }

    const handleChange = (field: keyof UpdateProfileRequest, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }))
    }

    return (
        <div className="bg-white rounded-xl border border-[#ebebeb] p-6">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-[14px] font-semibold text-[#3a3a3a] flex items-center gap-2">
                    <User className="h-4 w-4 text-[#1ca9b1]" />
                    About
                </h3>

                {!isEditing ? (
                    <button
                        onClick={onEdit}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-[#1ca9b1] hover:bg-[#f0fafa] rounded-lg transition-colors"
                    >
                        Edit Profile
                    </button>
                ) : (
                    <div className="flex items-center gap-2">
                        <button
                            onClick={onCancel}
                            disabled={isUpdating}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-[#727373] hover:bg-[#f5f5f5] rounded-lg transition-colors"
                        >
                            <X className="h-4 w-4" />
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={isUpdating}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-white bg-[#1ca9b1] hover:bg-[#17959c] rounded-lg transition-colors disabled:opacity-50"
                        >
                            <Save className="h-4 w-4" />
                            {isUpdating ? "Saving..." : "Save"}
                        </button>
                    </div>
                )}
            </div>

            {isEditing ? (
                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Bio */}
                    <div>
                        <label className="text-[11px] font-semibold uppercase tracking-wider text-[#727373]">
                            Bio
                        </label>
                        <textarea
                            value={formData.bio}
                            onChange={(e) => handleChange("bio", e.target.value)}
                            placeholder="Tell us about yourself..."
                            rows={4}
                            className="mt-1.5 w-full bg-white border border-[#e8e8e8] rounded-lg px-4 py-3 text-[13px] text-[#3a3a3a] placeholder:text-[#c4c4c4] focus:border-[#1ca9b1] focus:ring-2 focus:ring-[#1ca9b1]/15 outline-none transition-all resize-none"
                        />
                    </div>

                    {/* Job Title & Department */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div>
                            <label className="text-[11px] font-semibold uppercase tracking-wider text-[#727373] flex items-center gap-1.5">
                                <Briefcase className="h-3.5 w-3.5" />
                                Job Title
                            </label>
                            <input
                                type="text"
                                value={formData.job_title}
                                onChange={(e) => handleChange("job_title", e.target.value)}
                                placeholder="e.g. DevOps Engineer"
                                className="mt-1.5 w-full bg-white border border-[#e8e8e8] rounded-lg px-4 py-2.5 text-[13px] text-[#3a3a3a] placeholder:text-[#c4c4c4] focus:border-[#1ca9b1] focus:ring-2 focus:ring-[#1ca9b1]/15 outline-none transition-all"
                            />
                        </div>

                        <div>
                            <label className="text-[11px] font-semibold uppercase tracking-wider text-[#727373] flex items-center gap-1.5">
                                <Building2 className="h-3.5 w-3.5" />
                                Department
                            </label>
                            <input
                                type="text"
                                value={formData.department}
                                onChange={(e) => handleChange("department", e.target.value)}
                                placeholder="e.g. Engineering"
                                className="mt-1.5 w-full bg-white border border-[#e8e8e8] rounded-lg px-4 py-2.5 text-[13px] text-[#3a3a3a] placeholder:text-[#c4c4c4] focus:border-[#1ca9b1] focus:ring-2 focus:ring-[#1ca9b1]/15 outline-none transition-all"
                            />
                        </div>
                    </div>

                    {/* Phone & Timezone */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div>
                            <label className="text-[11px] font-semibold uppercase tracking-wider text-[#727373] flex items-center gap-1.5">
                                <Phone className="h-3.5 w-3.5" />
                                Phone
                            </label>
                            <input
                                type="text"
                                value={formData.phone}
                                onChange={(e) => handleChange("phone", e.target.value)}
                                placeholder="+1 (555) 123-4567"
                                className="mt-1.5 w-full bg-white border border-[#e8e8e8] rounded-lg px-4 py-2.5 text-[13px] text-[#3a3a3a] placeholder:text-[#c4c4c4] focus:border-[#1ca9b1] focus:ring-2 focus:ring-[#1ca9b1]/15 outline-none transition-all"
                            />
                        </div>

                        <div>
                            <label className="text-[11px] font-semibold uppercase tracking-wider text-[#727373] flex items-center gap-1.5">
                                <Globe className="h-3.5 w-3.5" />
                                Timezone
                            </label>
                            <select
                                value={formData.timezone}
                                onChange={(e) => handleChange("timezone", e.target.value)}
                                className="mt-1.5 w-full bg-white border border-[#e8e8e8] rounded-lg px-4 py-2.5 text-[13px] text-[#3a3a3a] focus:border-[#1ca9b1] focus:ring-2 focus:ring-[#1ca9b1]/15 outline-none transition-all cursor-pointer"
                            >
                                <option value="UTC">UTC</option>
                                <option value="America/New_York">Eastern Time (ET)</option>
                                <option value="America/Chicago">Central Time (CT)</option>
                                <option value="America/Denver">Mountain Time (MT)</option>
                                <option value="America/Los_Angeles">Pacific Time (PT)</option>
                                <option value="Europe/London">London (GMT)</option>
                                <option value="Europe/Paris">Paris (CET)</option>
                                <option value="Asia/Tokyo">Tokyo (JST)</option>
                                <option value="Asia/Dubai">Dubai (GST)</option>
                                <option value="Australia/Sydney">Sydney (AEDT)</option>
                            </select>
                        </div>
                    </div>
                </form>
            ) : (
                <div className="space-y-5">
                    {/* Bio display */}
                    <div>
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#727373]">Bio</span>
                        <p className="mt-1.5 text-[13px] text-[#3a3a3a] leading-relaxed">
                            {profile.bio || (
                                <span className="text-[#c4c4c4] italic">No bio provided yet. Click Edit Profile to add one.</span>
                            )}
                        </p>
                    </div>

                    {/* Info grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div>
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#727373] flex items-center gap-1.5">
                                <Briefcase className="h-3.5 w-3.5" />
                                Job Title
                            </span>
                            <p className="mt-1.5 text-[13px] text-[#3a3a3a]">{profile.job_title || "—"}</p>
                        </div>

                        <div>
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#727373] flex items-center gap-1.5">
                                <Building2 className="h-3.5 w-3.5" />
                                Department
                            </span>
                            <p className="mt-1.5 text-[13px] text-[#3a3a3a]">{profile.department || "—"}</p>
                        </div>

                        <div>
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#727373] flex items-center gap-1.5">
                                <Phone className="h-3.5 w-3.5" />
                                Phone
                            </span>
                            <p className="mt-1.5 text-[13px] text-[#3a3a3a]">{profile.phone || "—"}</p>
                        </div>

                        <div>
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#727373] flex items-center gap-1.5">
                                <Globe className="h-3.5 w-3.5" />
                                Timezone
                            </span>
                            <p className="mt-1.5 text-[13px] text-[#3a3a3a]">{profile.timezone}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}