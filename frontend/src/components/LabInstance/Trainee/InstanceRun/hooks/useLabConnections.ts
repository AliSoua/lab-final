// src/components/LabInstance/Trainee/InstanceRun/hooks/useLabConnections.ts
import { useState, useMemo, useEffect, useCallback } from "react"

interface ConnectionEntry {
    key: string
    connectionId: string
}

export function useLabConnections(connectionsMap: Record<string, string> | undefined) {
    const entries = useMemo<ConnectionEntry[]>(() => {
        if (!connectionsMap) return []
        return Object.entries(connectionsMap).map(([key, connectionId]) => ({ key, connectionId }))
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