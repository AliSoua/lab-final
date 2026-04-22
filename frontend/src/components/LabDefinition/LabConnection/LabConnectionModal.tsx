// src/components/LabDefinition/LabConnection/LabConnectionModal.tsx
import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { X, Plug, Lock, User, Eye, EyeOff, Globe, Tag, Hash, ArrowUpDown } from "lucide-react"
import type {
    LabConnectionCreateRequest,
    LabConnectionUpdateRequest,
    LabConnectionDetailResponse,
    ConnectionProtocol,
} from "@/types/LabDefinition/LabConnection"

interface LabConnectionModalProps {
    isOpen: boolean
    onClose: () => void
    mode: "create" | "edit"
    connection?: LabConnectionDetailResponse | null
    prefillSlug?: string
    prefillProtocol?: ConnectionProtocol
    onSubmit: (data: LabConnectionCreateRequest | LabConnectionUpdateRequest) => void
    isSubmitting: boolean
}

export function LabConnectionModal({
    isOpen,
    onClose,
    mode,
    connection,
    prefillSlug,
    prefillProtocol,
    onSubmit,
    isSubmitting,
}: LabConnectionModalProps) {
    const [slug, setSlug] = useState("")
    const [title, setTitle] = useState("")
    const [protocol, setProtocol] = useState<ConnectionProtocol>("ssh")
    const [port, setPort] = useState(22)
    const [order, setOrder] = useState(0)
    const [username, setUsername] = useState("")
    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirm, setShowConfirm] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (isOpen) {
            if (mode === "edit" && connection) {
                setSlug(connection.slug)
                setTitle(connection.title)
                setProtocol(connection.protocol)
                setPort(connection.port)
                setOrder(connection.order)
                setUsername(connection.username || "")
                setPassword("")
                setConfirmPassword("")
            } else {
                setSlug(prefillSlug || "")
                setTitle("")
                setProtocol(prefillProtocol || "ssh")
                setPort(prefillProtocol === "rdp" ? 3389 : prefillProtocol === "vnc" ? 5900 : 22)
                setOrder(0)
                setUsername("")
                setPassword("")
                setConfirmPassword("")
            }
            setError(null)
            setShowPassword(false)
            setShowConfirm(false)
        }
    }, [isOpen, mode, connection, prefillSlug, prefillProtocol])

    if (!isOpen) return null

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)

        if (!slug.trim() || !title.trim() || !username.trim() || !password.trim()) {
            setError("Slug, title, username, and password are required")
            return
        }

        if (password !== confirmPassword) {
            setError("Passwords do not match")
            return
        }

        const baseData = {
            slug: slug.trim(),
            title: title.trim(),
            protocol,
            port,
            config: {},
            order,
        }

        if (mode === "edit" && connection) {
            const updateData: LabConnectionUpdateRequest = {
                ...baseData,
                username: username.trim(),
                password,
            }
            onSubmit(updateData)
        } else {
            const createData: LabConnectionCreateRequest = {
                ...baseData,
                username: username.trim(),
                password,
            }
            onSubmit(createData)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
                onClick={!isSubmitting ? onClose : undefined}
            />

            <div className="relative w-full max-w-md bg-white rounded-xl border border-[#e8e8e8] shadow-xl mx-4 overflow-hidden max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#e8e8e8]">
                    <div className="flex items-center gap-2">
                        <Plug className="h-5 w-5 text-[#1ca9b1]" />
                        <h2 className="text-[15px] font-semibold text-[#3a3a3a]">
                            {mode === "create" ? "Add Connection" : "Edit Connection"}
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

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-xs text-red-700">{error}</p>
                        </div>
                    )}

                    {/* Slug */}
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-medium text-[#727373] uppercase tracking-wider">
                            Slug *
                        </label>
                        <div className="relative">
                            <Tag className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#c4c4c4]" />
                            <input
                                type="text"
                                value={slug}
                                onChange={(e) => setSlug(e.target.value)}
                                placeholder="e.g., router-lab-01"
                                disabled={isSubmitting || !!prefillSlug}
                                className={cn(
                                    "w-full rounded-lg border border-[#d4d4d4] bg-white pl-10 pr-3 py-2",
                                    "text-[13px] text-[#3a3a3a] placeholder:text-[#c4c4c4]",
                                    "outline-none focus:border-[#1ca9b1] transition-colors",
                                    "disabled:opacity-60"
                                )}
                            />
                        </div>
                        <p className="text-[10px] text-[#c4c4c4]">
                            credentials/lab_connections/{"{slug}"}/{"{protocol}"}
                        </p>
                    </div>

                    {/* Title */}
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-medium text-[#727373] uppercase tracking-wider">
                            Title *
                        </label>
                        <div className="relative">
                            <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#c4c4c4]" />
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="e.g., SSH Terminal"
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

                    {/* Protocol & Port */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-medium text-[#727373] uppercase tracking-wider">
                                Protocol *
                            </label>
                            <div className="relative">
                                <select
                                    value={protocol}
                                    onChange={(e) => {
                                        const p = e.target.value as ConnectionProtocol
                                        setProtocol(p)
                                        if (mode === "create") {
                                            setPort(p === "rdp" ? 3389 : p === "vnc" ? 5900 : 22)
                                        }
                                    }}
                                    disabled={isSubmitting || mode === "edit" || !!prefillProtocol}
                                    className={cn(
                                        "w-full rounded-lg border border-[#d4d4d4] bg-white px-3 py-2",
                                        "text-[13px] text-[#3a3a3a]",
                                        "outline-none focus:border-[#1ca9b1] transition-colors",
                                        "disabled:opacity-60 appearance-none"
                                    )}
                                >
                                    <option value="ssh">SSH</option>
                                    <option value="rdp">RDP</option>
                                    <option value="vnc">VNC</option>
                                </select>
                                <ArrowUpDown className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#c4c4c4] pointer-events-none" />
                            </div>
                            {mode === "edit" && (
                                <p className="text-[10px] text-amber-600">
                                    Protocol cannot be changed
                                </p>
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[11px] font-medium text-[#727373] uppercase tracking-wider">
                                Port *
                            </label>
                            <div className="relative">
                                <Hash className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#c4c4c4]" />
                                <input
                                    type="number"
                                    value={port}
                                    onChange={(e) => setPort(Number(e.target.value))}
                                    min={1}
                                    max={65535}
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
                    </div>

                    {/* Order */}
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-medium text-[#727373] uppercase tracking-wider">
                            Display Order
                        </label>
                        <input
                            type="number"
                            value={order}
                            onChange={(e) => setOrder(Number(e.target.value))}
                            min={0}
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
                                placeholder="e.g., labuser"
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
                                mode === "create" ? "Store Connection" : "Update Connection"
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}