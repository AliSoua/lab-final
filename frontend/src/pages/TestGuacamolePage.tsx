// src/pages/TestGuacamolePage.tsx
import { useAuth } from "@/hooks/useAuth"
import { useEffect, useState } from "react"

export default function TestGuacamolePage() {
    const { user, isAuthenticated } = useAuth()
    const [iframeKey, setIframeKey] = useState(0)

    // Reload iframe when user changes (e.g., after login)
    useEffect(() => {
        if (isAuthenticated) {
            setIframeKey((k) => k + 1)
        }
    }, [isAuthenticated, user?.username])

    if (!isAuthenticated) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="text-center">
                    <h2 className="text-xl font-semibold mb-2">Not Authenticated</h2>
                    <p className="text-gray-500">Please log in to access your lab environment.</p>
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-screen bg-gray-50">
            {/* Header bar */}
            <div className="bg-[#1ca9b1] text-white px-4 py-2 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                    <span className="font-semibold">Lab Environment</span>
                    <span className="text-xs bg-white/20 px-2 py-0.5 rounded">
                        {user?.username} ({user?.role})
                    </span>
                </div>
                <button
                    onClick={() => setIframeKey((k) => k + 1)}
                    className="text-xs bg-white/20 hover:bg-white/30 px-3 py-1 rounded transition"
                >
                    Reload Connection
                </button>
            </div>

            {/* Iframe */}
            <iframe
                key={iframeKey}
                src="/guacamole/"
                className="flex-1 w-full border-0"
                title="Guacamole Remote Desktop"
                allow="clipboard-read; clipboard-write"
            />
        </div>
    )
}