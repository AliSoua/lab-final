// src/components/LabDefinition/LabConnection/LabConnectionCard.tsx
import { cn } from "@/lib/utils"
import { Plug, Plus, Pencil, Trash2 } from "lucide-react"
import type {
    LabConnectionListItem,
    LabConnectionGroupedItem,
    ConnectionProtocol,
} from "@/types/LabDefinition/LabConnection"
import { ProtocolBadge } from "./ProtocolBadge"

const PROTOCOL_ORDER: ConnectionProtocol[] = ["ssh", "rdp", "vnc"]

interface LabConnectionCardProps {
    group: LabConnectionGroupedItem
    onAdd: (slug: string, protocol: ConnectionProtocol) => void
    onEdit: (connection: LabConnectionListItem) => void
    onDelete: (connection: LabConnectionListItem) => void
}

export function LabConnectionCard({
    group,
    onAdd,
    onEdit,
    onDelete,
}: LabConnectionCardProps) {
    const connectionMap = new Map(group.connections.map((c) => [c.protocol, c]))

    return (
        <div className="border border-[#e8e8e8] rounded-xl bg-white shadow-sm overflow-hidden">
            {/* Card Header */}
            <div className="px-5 py-4 border-b border-[#e8e8e8] bg-[#f9f9f9]">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#e6f7f8] flex items-center justify-center text-[#1ca9b1] shrink-0">
                        <Plug className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-[#3a3a3a] truncate">
                            {group.slug}
                        </h3>
                        <p className="text-[11px] text-[#727373]">
                            {group.connections.length} of 3 protocols configured
                        </p>
                    </div>
                </div>
            </div>

            {/* Protocol Slots */}
            <div className="divide-y divide-[#f0f0f0]">
                {PROTOCOL_ORDER.map((protocol) => {
                    const conn = connectionMap.get(protocol)

                    if (conn) {
                        return (
                            <div
                                key={protocol}
                                className="flex items-center justify-between px-5 py-3.5 hover:bg-[#f9f9f9] transition-colors"
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <ProtocolBadge protocol={protocol} />
                                    <div className="min-w-0">
                                        <p className="text-[13px] font-medium text-[#3a3a3a] truncate">
                                            {conn.title}
                                        </p>
                                        <p className="text-[11px] text-[#727373] font-mono">
                                            port {conn.port}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                    <button
                                        onClick={() => onEdit(conn)}
                                        className={cn(
                                            "flex h-7 w-7 items-center justify-center rounded-lg",
                                            "text-[#727373] hover:bg-[#e6f7f8] hover:text-[#1ca9b1]",
                                            "transition-colors"
                                        )}
                                        title="Edit"
                                    >
                                        <Pencil className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                        onClick={() => onDelete(conn)}
                                        className={cn(
                                            "flex h-7 w-7 items-center justify-center rounded-lg",
                                            "text-[#727373] hover:bg-red-50 hover:text-red-600",
                                            "transition-colors"
                                        )}
                                        title="Remove"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            </div>
                        )
                    }

                    return (
                        <div
                            key={protocol}
                            className="flex items-center justify-between px-5 py-3.5"
                        >
                            <div className="flex items-center gap-3">
                                <ProtocolBadge protocol={protocol} />
                                <span className="text-[13px] text-[#c4c4c4] italic">
                                    Not configured
                                </span>
                            </div>

                            <button
                                onClick={() => onAdd(group.slug, protocol)}
                                className={cn(
                                    "flex items-center gap-1.5 rounded-lg px-3 py-1.5",
                                    "bg-[#1ca9b1]/10 text-[#1ca9b1] text-[12px] font-medium",
                                    "hover:bg-[#1ca9b1]/20 transition-colors"
                                )}
                            >
                                <Plus className="h-3.5 w-3.5" />
                                Add
                            </button>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}