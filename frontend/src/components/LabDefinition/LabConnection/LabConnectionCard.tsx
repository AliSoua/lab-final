// src/components/LabDefinition/LabConnection/LabConnectionCard.tsx
import { cn } from "@/lib/utils"
import { Plug, Plus, Trash2, Hash, ArrowUpDown, ShieldCheck } from "lucide-react"
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
    onDelete: (connection: LabConnectionListItem) => void
}

export function LabConnectionCard({
    group,
    onAdd,
    onDelete,
}: LabConnectionCardProps) {
    const connectionMap = new Map(group.connections.map((c) => [c.protocol, c]))
    const configuredCount = group.connections.length

    return (
        <div className="border border-[#e8e8e8] rounded-xl bg-white shadow-sm overflow-hidden hover:shadow-md hover:border-[#1ca9b1]/20 transition-all duration-200 group">
            {/* Card Header */}
            <div className="px-5 py-4 border-b border-[#e8e8e8] bg-[#fafafa]">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-[#e6f7f8] flex items-center justify-center text-[#1ca9b1] shrink-0">
                            <Plug className="h-4.5 w-4.5" />
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-sm font-semibold text-[#3a3a3a] truncate">
                                {group.slug}
                            </h3>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <span className={cn(
                                    "text-[10px] px-1.5 py-0.5 rounded font-medium",
                                    configuredCount === 3
                                        ? "bg-green-50 text-green-600"
                                        : configuredCount > 0
                                            ? "bg-amber-50 text-amber-600"
                                            : "bg-[#f5f5f5] text-[#727373]"
                                )}>
                                    {configuredCount}/3 configured
                                </span>
                                {configuredCount === 3 && (
                                    <ShieldCheck className="h-3 w-3 text-green-500" />
                                )}
                            </div>
                        </div>
                    </div>

                    {configuredCount < 3 && (
                        <span className="text-[10px] text-[#c4c4c4] font-medium">
                            {3 - configuredCount} slot{3 - configuredCount !== 1 ? "s" : ""} free
                        </span>
                    )}
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
                                className="flex items-center justify-between px-5 py-3.5 hover:bg-[#f9f9f9] transition-colors group/row"
                            >
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <ProtocolBadge protocol={protocol} />
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[13px] font-medium text-[#3a3a3a] truncate">
                                            {conn.title}
                                        </p>
                                        <div className="flex items-center gap-3 mt-1">
                                            <span className="text-[10px] text-[#727373] flex items-center gap-1">
                                                <Hash className="h-3 w-3" />
                                                {conn.port}
                                            </span>
                                            <span className="text-[10px] text-[#727373] flex items-center gap-1">
                                                <ArrowUpDown className="h-3 w-3" />
                                                {conn.order}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={() => onDelete(conn)}
                                    className={cn(
                                        "flex h-8 w-8 items-center justify-center rounded-lg",
                                        "text-[#c4c4c4] hover:bg-red-50 hover:text-red-500",
                                        "transition-colors opacity-0 group-hover/row:opacity-100",
                                        "focus:opacity-100"
                                    )}
                                    title="Remove connection"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        )
                    }

                    return (
                        <div
                            key={protocol}
                            className="flex items-center justify-between px-5 py-3.5"
                        >
                            <div className="flex items-center gap-3 opacity-40">
                                <ProtocolBadge protocol={protocol} />
                                <span className="text-[13px] text-[#727373] italic">
                                    Not configured
                                </span>
                            </div>

                            <button
                                onClick={() => onAdd(group.slug, protocol)}
                                className={cn(
                                    "flex items-center gap-1.5 rounded-lg px-3 py-1.5",
                                    "bg-[#1ca9b1]/10 text-[#1ca9b1] text-[12px] font-medium",
                                    "hover:bg-[#1ca9b1] hover:text-white hover:shadow-sm",
                                    "transition-all duration-200"
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