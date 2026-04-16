// src/pages/LoginPage.tsx
import { useState } from "react"
import { Navigate, useNavigate } from "react-router-dom"
import { useAuth } from "@/hooks/useAuth"
import { Loader2, FlaskConical, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

const FEATURE_HIGHLIGHTS = [
    "Provision and tear down lab environments in seconds",
    "Track learner progress across structured paths",
    "Monitor infrastructure usage and performance",
]

// ── Underline input ────────────────────────────────────────────────────────────

interface UnderlineInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string
}

function UnderlineInput({ label, id, ...props }: UnderlineInputProps) {
    const [focused, setFocused] = useState(false)

    return (
        <div className="flex flex-col gap-1.5">
            <label
                htmlFor={id}
                className={cn(
                    "text-[10.5px] font-semibold uppercase tracking-widest transition-colors duration-200",
                    focused ? "text-[#1ca9b1]" : "text-[#727373]"
                )}
            >
                {label}
            </label>
            <input
                id={id}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                className={cn(
                    // layout & spacing — pl-1 gives the text a small left indent so
                    // it doesn't sit flush against the border-b edge
                    "w-full bg-transparent pl-1 pr-0 py-2 text-sm text-[#3a3a3a]",
                    "border-0 border-b outline-none",
                    "placeholder:text-[#c8c8c8]",
                    "transition-[border-color,border-width] duration-200",
                    focused
                        ? "border-b-2 border-[#1ca9b1]"
                        : "border-b border-[#d4d4d4]"
                )}
                {...props}
            />
        </div>
    )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LoginPage() {
    const { login, isAuthenticated } = useAuth()
    const navigate = useNavigate()
    const [username, setUsername] = useState("")
    const [password, setPassword] = useState("")
    const [isLoading, setIsLoading] = useState(false)

    if (isAuthenticated) {
        return <Navigate to="/" replace />
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)

        // Show a loading toast that we resolve or reject based on the result
        const toastId = toast.loading("Signing in…")

        try {
            const success = await login(username, password)

            if (success) {
                toast.success("Welcome back!", {
                    id: toastId,
                    description: "Redirecting to your dashboard.",
                    duration: 2000,
                })
                navigate("/", { replace: true })
            } else {
                toast.error("Sign-in failed", {
                    id: toastId,
                    description: "Incorrect username or password. Please try again.",
                    duration: 4000,
                })
            }
        } catch {
            toast.error("Something went wrong", {
                id: toastId,
                description: "Unable to reach the server. Please try again.",
                duration: 4000,
            })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="flex min-h-screen font-['Inter','Helvetica_Neue',Arial,sans-serif]">

            {/* ── Left: Form panel ── */}
            <main className="flex w-full max-w-[480px] flex-col justify-between bg-white px-14 py-10">

                {/* Logo */}
                <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1ca9b1]">
                        <FlaskConical className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-[14.5px] font-semibold tracking-tight text-[#3a3a3a]">
                        Lab Orchestration
                    </span>
                </div>

                {/* Form block */}
                <div className="flex flex-col gap-9">

                    {/* Heading */}
                    <div className="flex flex-col gap-1.5">
                        <p className="text-[10.5px] font-semibold uppercase tracking-[0.13em] text-[#1ca9b1]">
                            Welcome back
                        </p>
                        <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.025em] text-[#3a3a3a]">
                            Sign in to your account
                        </h1>
                        <p className="text-[13.5px] leading-relaxed text-[#727373]">
                            Enter your credentials to continue.
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-7">
                        <UnderlineInput
                            id="username"
                            label="Username"
                            type="text"
                            placeholder="your.username"
                            autoComplete="username"
                            autoFocus
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />

                        <UnderlineInput
                            id="password"
                            label="Password"
                            type="password"
                            placeholder="••••••••"
                            autoComplete="current-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />

                        <button
                            type="submit"
                            disabled={isLoading}
                            className={cn(
                                "mt-1 flex h-[42px] w-full items-center justify-center gap-2",
                                "rounded-md bg-[#1ca9b1] text-[13.5px] font-semibold tracking-wide text-white",
                                "transition-colors duration-200",
                                "hover:bg-[#17959c]",
                                "disabled:cursor-not-allowed disabled:opacity-60"
                            )}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="h-[15px] w-[15px] animate-spin" />
                                    Signing in…
                                </>
                            ) : (
                                "Sign in"
                            )}
                        </button>
                    </form>
                </div>

                {/* Footer */}
                <p className="text-[12px] text-[#c4c4c4]">
                    Need access?{" "}
                    <a
                        href="mailto:admin@example.com"
                        className="text-[#1ca9b1] no-underline hover:underline"
                    >
                        Contact your administrator
                    </a>
                </p>
            </main>

            {/* ── Right: Brand panel ── */}
            <aside
                className="relative flex flex-1 flex-col justify-center overflow-hidden px-16 py-16 text-white"
                style={{
                    background: "linear-gradient(160deg, #0d8f96 0%, #1ca9b1 55%, #2ec4cc 100%)",
                }}
            >
                {/* Decorative circles */}
                <div className="pointer-events-none absolute -right-20 -top-20 h-[360px] w-[360px] rounded-full border border-white/10" />
                <div className="pointer-events-none absolute -right-10 -top-10 h-[240px] w-[240px] rounded-full border border-white/[0.08]" />
                <div className="pointer-events-none absolute -bottom-24 -left-14 h-[320px] w-[320px] rounded-full border border-white/[0.07]" />

                {/* Content */}
                <div className="relative max-w-[440px]">
                    <p className="mb-4 text-[10.5px] font-bold uppercase tracking-[0.16em] text-white/60">
                        Cloud Lab Platform
                    </p>
                    <h2 className="mb-5 text-[2.4rem] font-bold leading-[1.18] tracking-[-0.03em] text-white">
                        Hands on learning,
                        <br />
                        at any scale.
                    </h2>
                    <p className="mb-11 text-[14.5px] leading-[1.7] text-white/70">
                        Spin up real infrastructure, guide learners through interactive
                        labs, and measure outcomes — all from a single platform.
                    </p>

                    <ul className="flex flex-col gap-3.5">
                        {FEATURE_HIGHLIGHTS.map((item) => (
                            <li key={item} className="flex items-start gap-3">
                                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-white/90" />
                                <span className="text-[13.5px] leading-snug text-white/75">
                                    {item}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Bottom rule + copyright */}
                <div className="absolute bottom-10 left-16 right-16 flex items-center gap-3">
                    <div className="h-px flex-1 bg-white/20" />
                    <p className="shrink-0 text-[11px] text-white/40">
                        &copy; {new Date().getFullYear()} Lab Orchestration
                    </p>
                    <div className="h-px flex-1 bg-white/20" />
                </div>
            </aside>
        </div>
    )
}