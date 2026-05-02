// src/components/LabInstance/Trainee/InstanceRun/hooks/useLabConnections.ts
import { useState, useMemo, useEffect, useCallback } from "react"

export type ConnectionProtocol = "ssh" | "vnc" | "rdp" | "unknown"

export interface ConnectionEntry {
    key: string
    connectionId: string
    protocol: ConnectionProtocol
}

function detectProtocol(key: string): ConnectionProtocol {
    const lower = key.toLowerCase()
    if (lower.includes("ssh")) return "ssh"
    if (lower.includes("vnc")) return "vnc"
    if (lower.includes("rdp") || lower.includes("remote desktop")) return "rdp"
    return "unknown"
}

export function useLabConnections(connectionsMap: Record<string, string> | undefined) {
    const entries = useMemo<ConnectionEntry[]>(() => {
        if (!connectionsMap) return []
        return Object.entries(connectionsMap).map(([key, connectionId]) => ({
            key,
            connectionId,
            protocol: detectProtocol(key),
        }))
    }, [connectionsMap])

    const [activeKey, setActiveKey] = useState<string | null>(null)

    useEffect(() => {
        if (entries.length === 0) {
            setActiveKey(null)
            return
        }
        setActiveKey(prev => (prev && entries.some(e => e.key === prev) ? prev : entries[0].key))
    }, [entries])

    const activeConnectionId = useMemo(() => {
        if (!activeKey) return null
        return connectionsMap?.[activeKey] ?? null
    }, [activeKey, connectionsMap])

    const selectConnection = useCallback((key: string) => {
        setActiveKey(key)
    }, [])

    return {
        entries,
        activeKey,
        activeConnectionId,
        selectConnection,
        hasConnections: entries.length > 0,
    }
}