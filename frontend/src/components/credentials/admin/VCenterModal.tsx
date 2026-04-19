// src/components/credentials/admin/VCenterModal.tsx
import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { X, Server, Lock, User, Eye, EyeOff } from "lucide-react"
import type { VCenterInfo, VCenterCredentialsCreateRequest, VCenterCredentialsUpdateRequest } from "@/types/credentials/admin"

interface VCenterModalProps {
    isOpen: boolean
    onClose: () => void
    mode: "create" | "edit"
    vcenter?: VCenterInfo | null
    onSubmit: (data: VCenterCredentialsCreateRequest | VCenterCredentialsUpdateRequest) => void
    isSubmitting: boolean
}

export function VCenterModal({ isOpen, onClose, mode, vcenter, onSubmit, isSubmitting }: VCenterModalProps) {
    const [vcenterHost, setVcenterHost] = useState("")
    const [username, setUsername] = useState("")
    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [oldPassword, setOldPassword] = useState("")
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirm, setShowConfirm] = useState(false)
    const [showOld, setShowOld] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (isOpen) {
            if (mode === "edit" && vcenter) {
                setVcenterHost(vcenter.vcenter_host)
                setUsername(vcenter.username)
                setPassword("")
                setConfirmPassword("")
                setOldPassword("")
            } else {
                setVcenterHost("")
                setUsername("")
                setPassword("")
                setConfirmPassword("")
                setOldPassword("")
            }
            setError(null)
            setShowPassword(false)
            setShowConfirm(false)
            setShowOld(false)
        }
    }, [isOpen, mode, vcenter])

    if (!isOpen) return null

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)

        if (!vcenterHost.trim() || !username.trim() || !password.trim()) {
            setError("All fields are required")
            return
        }

        if (password !== confirmPassword) {
            setError("Passwords do not match")
            return
        }

        if (mode === "edit" && vcenter) {
            if (!oldPassword.trim()) {
                setError("Old password is required to update credentials")
                return
            }

            const updateData: VCenterCredentialsUpdateRequest = {
                vcenter_host: vcenterHost.trim(),
                username: username.trim(),
                password: password,
                old_username: vcenter.username,
                old_password: oldPassword,
            }
            onSubmit(updateData)
        } else {
            const createData: VCenterCredentialsCreateRequest = {
                vcenter_host: vcenterHost.trim(),
                username: username.trim(),
                password: password,
            }
            onSubmit(createData)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
                onClick={!isSubmitting ? onClose : undefined}
            />

            {/* Modal */}
            <div className="relative w-full max-w-md bg-white rounded-xl border border-[#e8e8e8] shadow-xl mx-4 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#e8e8e8]">
                    <div className="flex items-center gap-2">
                        <Server className="h-5 w-5 text-[#1ca9b1]" />
                        <h2 className="text-[15px] font-semibold text-[#3a3a3a]">
                            {mode === "create" ? "Add vCenter" : "Edit Credentials"}
                        </h2>
                    </div>
                    {!isSubmitting && (
                        <button
                            onClick={onClose}
                            className="p-1.5 text-[#c4c4c4] hover:text-[#3a3a3a] hover:bg-[#f5f5f5] rounded-lg transition-colors"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-xs text-red-700">{error}</p>
                        </div>
                    )}

                    {/* vCenter Host */}
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-medium text-[#727373] uppercase tracking-wider">
                            vCenter Host Name *
                        </label>
                        <input
                            type="text"
                            value={vcenterHost}
                            onChange={(e) => setVcenterHost(e.target.value)}
                            placeholder="e.g., vcenter.lab.local or 192.168.1.100"
                            disabled={isSubmitting}
                            className={cn(
                                "w-full rounded-lg border border-[#d4d4d4] bg-white px-3 py-2",
                                "text-[13px] text-[#3a3a3a] placeholder:text-[#c4c4c4]",
                                "outline-none focus:border-[#1ca9b1] transition-colors",
                                "disabled:opacity-60"
                            )}
                        />
                    </div>

                    {/* Username */}
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-medium text-[#727373] uppercase tracking-wider">
                            Username *
                        </label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#c4c4c4]" />
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="e.g., administrator@vsphere.local"
                                disabled={isSubmitting}
                                className={cn(
                                    "w-full rounded-lg border border-[#d4d4d4] bg-white pl-10 pr-3 py-2",
                                    "text-[13px] text-[#3a3a3a] placeholder:text-[#c4c4c4]",
                                    "outline-none focus:border-[#1ca9b1] transition-colors",
                                    "disabled:opacity-60"
                                )}
                            />
                        </div>
                    </div>

                    {/* Password */}
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-medium text-[#727373] uppercase tracking-wider">
                            {mode === "edit" ? "New Password *" : "Password *"}
                        </label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#c4c4c4]" />
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                disabled={isSubmitting}
                                className={cn(
                                    "w-full rounded-lg border border-[#d4d4d4] bg-white pl-10 pr-10 py-2",
                                    "text-[13px] text-[#3a3a3a] placeholder:text-[#c4c4c4]",
                                    "outline-none focus:border-[#1ca9b1] transition-colors",
                                    "disabled:opacity-60"
                                )}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#c4c4c4] hover:text-[#727373]"
                            >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                    </div>

                    {/* Confirm Password */}
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-medium text-[#727373] uppercase tracking-wider">
                            Confirm Password *
                        </label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#c4c4c4]" />
                            <input
                                type={showConfirm ? "text" : "password"}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="••••••••"
                                disabled={isSubmitting}
                                className={cn(
                                    "w-full rounded-lg border border-[#d4d4d4] bg-white pl-10 pr-10 py-2",
                                    "text-[13px] text-[#3a3a3a] placeholder:text-[#c4c4c4]",
                                    "outline-none focus:border-[#1ca9b1] transition-colors",
                                    "disabled:opacity-60"
                                )}
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirm(!showConfirm)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#c4c4c4] hover:text-[#727373]"
                            >
                                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                    </div>

                    {/* Old Password (edit only) */}
                    {mode === "edit" && (
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-medium text-[#727373] uppercase tracking-wider">
                                Current Password *
                            </label>
                            <p className="text-[10px] text-[#c4c4c4]">
                                Required to verify ownership before making changes
                            </p>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#c4c4c4]" />
                                <input
                                    type={showOld ? "text" : "password"}
                                    value={oldPassword}
                                    onChange={(e) => setOldPassword(e.target.value)}
                                    placeholder="Enter current password"
                                    disabled={isSubmitting}
                                    className={cn(
                                        "w-full rounded-lg border border-[#d4d4d4] bg-white pl-10 pr-10 py-2",
                                        "text-[13px] text-[#3a3a3a] placeholder:text-[#c4c4c4]",
                                        "outline-none focus:border-[#1ca9b1] transition-colors",
                                        "disabled:opacity-60"
                                    )}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowOld(!showOld)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#c4c4c4] hover:text-[#727373]"
                                >
                                    {showOld ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className={cn(
                                "px-4 py-2 rounded-lg text-sm font-medium",
                                "text-[#727373] hover:bg-[#f5f5f5] hover:text-[#3a3a3a]",
                                "transition-colors disabled:opacity-60"
                            )}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-lg",
                                "bg-[#1ca9b1] text-white text-sm font-medium",
                                "hover:bg-[#17959c] transition-colors",
                                "disabled:opacity-60 disabled:cursor-not-allowed"
                            )}
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    {mode === "create" ? "Storing..." : "Updating..."}
                                </>
                            ) : (
                                mode === "create" ? "Store Credentials" : "Update Credentials"
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}