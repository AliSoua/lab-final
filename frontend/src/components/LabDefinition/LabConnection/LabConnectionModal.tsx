// src/components/LabDefinition/LabConnection/LabConnectionModal.tsx
import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import {
    X,
    Plug,
    Lock,
    User,
    Eye,
    EyeOff,
    Globe,
    Tag,
    Hash,
    ArrowUpDown,
    Sparkles,
    FolderTree,
    AlertCircle,
} from "lucide-react"
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

/* ── Helpers ─────────────────────────────────────────────────────────────── */

function formatSlugInput(value: string): string {
    // Allow dashes during typing, but strip other special chars
    return value
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")   // strip special chars (keep dashes)
        .replace(/\s+/g, "-")            // spaces → dashes
        .replace(/-+/g, "-")             // collapse multiple dashes
}

function normalizeSlug(value: string): string {
    // Final cleanup: trim leading/trailing dashes
    return value.replace(/^-+|-+$/g, "")
}

function generateTitle(slug: string, protocol: string): string {
    if (!slug) return ""
    const readable = slug
        .split("-")
        .filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ")
    return `${readable} - ${protocol.toUpperCase()}`
}

function defaultPort(protocol: ConnectionProtocol): number {
    if (protocol === "rdp") return 3389
    if (protocol === "vnc") return 5900
    return 22
}

/* ── Component ───────────────────────────────────────────────────────────── */

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

    /* Reset & hydrate on open */
    useEffect(() => {
        if (!isOpen) return

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
            const initialSlug = prefillSlug ? formatSlugInput(prefillSlug) : ""
            const initialProtocol = prefillProtocol || "ssh"
            setSlug(initialSlug)
            setTitle(generateTitle(initialSlug, initialProtocol))
            setProtocol(initialProtocol)
            setPort(defaultPort(initialProtocol))
            setOrder(0)
            setUsername("")
            setPassword("")
            setConfirmPassword("")
        }

        setError(null)
        setShowPassword(false)
        setShowConfirm(false)
    }, [isOpen, mode, connection, prefillSlug, prefillProtocol])

    /* Auto-generate title in create mode whenever slug or protocol changes */
    useEffect(() => {
        if (mode === "create") {
            setTitle(generateTitle(slug, protocol))
        }
    }, [slug, protocol, mode])

    if (!isOpen) return null

    const isSlugLocked = mode === "edit" || !!prefillSlug

    const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const formatted = formatSlugInput(e.target.value)
        setSlug(formatted)
    }

    const handleProtocolChange = (p: ConnectionProtocol) => {
        setProtocol(p)
        if (mode === "create") {
            setPort(defaultPort(p))
        }
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)

        const normalizedSlug = normalizeSlug(slug)

        if (!normalizedSlug) {
            setError("Slug is required and cannot start or end with a dash")
            return
        }

        if (!title.trim() || !username.trim() || !password.trim()) {
            setError("Title, username, and password are required")
            return
        }

        if (password !== confirmPassword) {
            setError("Passwords do not match")
            return
        }

        const baseData = {
            slug: normalizedSlug,
            title: title.trim(),
            protocol,
            port,
            config: {},
            order,
        }

        if (mode === "edit" && connection) {
            onSubmit({ ...baseData, username: username.trim(), password } as LabConnectionUpdateRequest)
        } else {
            onSubmit({ ...baseData, username: username.trim(), password } as LabConnectionCreateRequest)
        }
    }

    const slugHasTrailingDash = slug.endsWith("-") && slug.length > 0

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
                onClick={!isSubmitting ? onClose : undefined}
            />

            <div className="relative w-full max-w-md bg-white rounded-xl border border-[#e8e8e8] shadow-xl mx-4 overflow-hidden max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#e8e8e8] bg-[#fafafa]">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-[#e6f7f8] flex items-center justify-center text-[#1ca9b1]">
                            <Plug className="h-4 w-4" />
                        </div>
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

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {error && (
                        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                            <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                            <p className="text-xs text-red-700 font-medium">{error}</p>
                        </div>
                    )}

                    {/* ── Slug ── */}
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-semibold text-[#727373] uppercase tracking-wider">
                            Vault Slug *
                        </label>
                        <div className="relative">
                            <Tag className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#c4c4c4]" />
                            <input
                                type="text"
                                value={slug}
                                onChange={handleSlugChange}
                                placeholder="e.g., router-lab-01"
                                disabled={isSubmitting || isSlugLocked}
                                className={cn(
                                    "w-full rounded-lg border bg-white pl-10 pr-3 py-2.5",
                                    "text-[13px] text-[#3a3a3a] placeholder:text-[#c4c4c4]",
                                    "outline-none focus:ring-1 focus:ring-[#1ca9b1]/20 transition-all",
                                    "disabled:opacity-60 disabled:bg-[#f9f9f9]",
                                    slugHasTrailingDash
                                        ? "border-amber-400 focus:border-amber-400"
                                        : "border-[#d4d4d4] focus:border-[#1ca9b1]"
                                )}
                            />
                        </div>

                        {slugHasTrailingDash && (
                            <p className="text-[10px] text-amber-600 flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                Trailing dash will be removed on save
                            </p>
                        )}

                        {/* Vault path preview */}
                        <div className="flex items-start gap-2 p-2.5 bg-[#f9f9f9] border border-[#e8e8e8] rounded-lg">
                            <FolderTree className="h-3.5 w-3.5 text-[#c4c4c4] shrink-0 mt-0.5" />
                            <code className="text-[11px] text-[#727373] font-mono break-all">
                                credentials/lab_connections/
                                <span className="text-[#1ca9b1] font-semibold">{normalizeSlug(slug) || "..."}</span>/
                                <span className="text-[#1ca9b1] font-semibold">{protocol}</span>
                            </code>
                        </div>

                        {mode === "create" && !slugHasTrailingDash && (
                            <p className="text-[10px] text-[#c4c4c4]">
                                Use letters, numbers, spaces (become dashes), and dashes.
                            </p>
                        )}
                        {isSlugLocked && (
                            <p className="text-[10px] text-amber-600">
                                Slug cannot be changed — it is the vault path identifier.
                            </p>
                        )}
                    </div>

                    {/* ── Title (Auto-generated) ── */}
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <label className="text-[11px] font-semibold text-[#727373] uppercase tracking-wider">
                                Title
                            </label>
                            <span className="text-[10px] text-[#1ca9b1] font-medium flex items-center gap-1">
                                <Sparkles className="h-3 w-3" />
                                Auto-generated
                            </span>
                        </div>
                        <div className="relative">
                            <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#c4c4c4]" />
                            <input
                                type="text"
                                value={title}
                                readOnly
                                disabled
                                className={cn(
                                    "w-full rounded-lg border border-[#e8e8e8] bg-[#f9f9f9] pl-10 pr-3 py-2.5",
                                    "text-[13px] text-[#3a3a3a]",
                                    "cursor-not-allowed select-all"
                                )}
                            />
                        </div>
                        <p className="text-[10px] text-[#c4c4c4]">
                            Derived from the slug with the protocol appended.
                        </p>
                    </div>

                    {/* ── Protocol & Port ── */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-semibold text-[#727373] uppercase tracking-wider">
                                Protocol *
                            </label>
                            <div className="relative">
                                <select
                                    value={protocol}
                                    onChange={(e) => handleProtocolChange(e.target.value as ConnectionProtocol)}
                                    disabled={isSubmitting || mode === "edit" || !!prefillProtocol}
                                    className={cn(
                                        "w-full rounded-lg border border-[#d4d4d4] bg-white px-3 py-2.5",
                                        "text-[13px] text-[#3a3a3a]",
                                        "outline-none focus:border-[#1ca9b1] focus:ring-1 focus:ring-[#1ca9b1]/20 transition-all",
                                        "disabled:opacity-60 disabled:bg-[#f9f9f9] appearance-none"
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
                                    Protocol is locked after creation.
                                </p>
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[11px] font-semibold text-[#727373] uppercase tracking-wider">
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
                                        "w-full rounded-lg border border-[#d4d4d4] bg-white pl-10 pr-3 py-2.5",
                                        "text-[13px] text-[#3a3a3a]",
                                        "outline-none focus:border-[#1ca9b1] focus:ring-1 focus:ring-[#1ca9b1]/20 transition-all",
                                        "disabled:opacity-60"
                                    )}
                                />
                            </div>
                        </div>
                    </div>

                    {/* ── Order ── */}
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-semibold text-[#727373] uppercase tracking-wider">
                            Display Order
                        </label>
                        <input
                            type="number"
                            value={order}
                            onChange={(e) => setOrder(Number(e.target.value))}
                            min={0}
                            disabled={isSubmitting}
                            className={cn(
                                "w-full rounded-lg border border-[#d4d4d4] bg-white px-3 py-2.5",
                                "text-[13px] text-[#3a3a3a]",
                                "outline-none focus:border-[#1ca9b1] focus:ring-1 focus:ring-[#1ca9b1]/20 transition-all",
                                "disabled:opacity-60"
                            )}
                        />
                    </div>

                    {/* ── Username ── */}
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-semibold text-[#727373] uppercase tracking-wider">
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
                                    "w-full rounded-lg border border-[#d4d4d4] bg-white pl-10 pr-3 py-2.5",
                                    "text-[13px] text-[#3a3a3a] placeholder:text-[#c4c4c4]",
                                    "outline-none focus:border-[#1ca9b1] focus:ring-1 focus:ring-[#1ca9b1]/20 transition-all",
                                    "disabled:opacity-60"
                                )}
                            />
                        </div>
                    </div>

                    {/* ── Password ── */}
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-semibold text-[#727373] uppercase tracking-wider">
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
                                    "w-full rounded-lg border border-[#d4d4d4] bg-white pl-10 pr-10 py-2.5",
                                    "text-[13px] text-[#3a3a3a] placeholder:text-[#c4c4c4]",
                                    "outline-none focus:border-[#1ca9b1] focus:ring-1 focus:ring-[#1ca9b1]/20 transition-all",
                                    "disabled:opacity-60"
                                )}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                tabIndex={-1}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#c4c4c4] hover:text-[#727373] transition-colors"
                            >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                    </div>

                    {/* ── Confirm Password ── */}
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-semibold text-[#727373] uppercase tracking-wider">
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
                                    "w-full rounded-lg border border-[#d4d4d4] bg-white pl-10 pr-10 py-2.5",
                                    "text-[13px] text-[#3a3a3a] placeholder:text-[#c4c4c4]",
                                    "outline-none focus:border-[#1ca9b1] focus:ring-1 focus:ring-[#1ca9b1]/20 transition-all",
                                    "disabled:opacity-60"
                                )}
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirm(!showConfirm)}
                                tabIndex={-1}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#c4c4c4] hover:text-[#727373] transition-colors"
                            >
                                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                    </div>

                    {/* ── Footer ── */}
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
                                "flex items-center gap-2 px-5 py-2 rounded-lg",
                                "bg-[#1ca9b1] text-white text-sm font-medium",
                                "hover:bg-[#17959c] hover:shadow-md transition-all",
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