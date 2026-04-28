// src/pages/LabDefinition/LabConnectionPage.tsx
import { useState, useMemo } from "react"
import { cn } from "@/lib/utils"
import { Shield, Plus, Search, FolderTree, Plug, Trash2 } from "lucide-react"
import { useLabConnection } from "@/hooks/LabDefinition/useLabConnection"
import { LabConnectionCard } from "@/components/LabDefinition/LabConnection/LabConnectionCard"
import { LabConnectionModal } from "@/components/LabDefinition/LabConnection/LabConnectionModal"
import type {
    LabConnectionListItem,
    LabConnectionDetailResponse,
    LabConnectionCreateRequest,
    LabConnectionUpdateRequest,
    ConnectionProtocol,
} from "@/types/LabDefinition/LabConnection"

export default function LabConnectionPage() {
    const {
        grouped,
        isLoading,
        isSubmitting,
        refetchGrouped,
        createConnection,
        updateConnection,
        deleteConnection,
        getConnectionDetail,
    } = useLabConnection()

    const [modalOpen, setModalOpen] = useState(false)
    const [modalMode, setModalMode] = useState<"create" | "edit">("create")
    const [selectedConnection, setSelectedConnection] = useState<LabConnectionDetailResponse | null>(null)
    const [prefillSlug, setPrefillSlug] = useState<string>("")
    const [prefillProtocol, setPrefillProtocol] = useState<ConnectionProtocol | undefined>()
    const [deleteConfirm, setDeleteConfirm] = useState<LabConnectionListItem | null>(null)
    const [searchQuery, setSearchQuery] = useState("")

    const handleAddNew = () => {
        setPrefillSlug("")
        setPrefillProtocol(undefined)
        setSelectedConnection(null)
        setModalMode("create")
        setModalOpen(true)
    }

    const handleAddToSlug = (slug: string, protocol: ConnectionProtocol) => {
        setPrefillSlug(slug)
        setPrefillProtocol(protocol)
        setSelectedConnection(null)
        setModalMode("create")
        setModalOpen(true)
    }

    const handleDelete = (connection: LabConnectionListItem) => {
        setDeleteConfirm(connection)
    }

    const confirmDelete = async (connectionId: string) => {
        try {
            await deleteConnection(connectionId)
            setDeleteConfirm(null)
        } catch {
            // Error handled by hook
        }
    }

    const handleSubmit = async (
        data: LabConnectionCreateRequest | LabConnectionUpdateRequest
    ) => {
        try {
            if (modalMode === "create") {
                await createConnection(data as LabConnectionCreateRequest)
                setModalOpen(false)
            } else {
                if (!selectedConnection) return
                await updateConnection(selectedConnection.id, data as LabConnectionUpdateRequest)
                setModalOpen(false)
            }
        } catch {
            // Error handled by hook
        }
    }

    const filteredGroups = searchQuery
        ? grouped.filter(
            (g) =>
                g.slug.includes(searchQuery.toLowerCase()) ||
                g.connections.some((c) =>
                    c.title.toLowerCase().includes(searchQuery.toLowerCase())
                )
        )
        : grouped

    return (
        <div className="flex flex-col h-full bg-[#f9f9f9]">
            {/* Header */}
            <div className="bg-white border-b border-[#e8e8e8] px-6 py-5 shrink-0">
                <div className="flex items-center justify-between w-full px-4">
                    <div>
                        <h1 className="text-xl font-semibold text-[#3a3a3a]">
                            Lab Connections
                        </h1>
                        <p className="text-sm text-[#727373] mt-0.5">
                            Manage transport layers per slug — SSH, RDP, and VNC slots
                        </p>
                    </div>

                    <button
                        onClick={handleAddNew}
                        className={cn(
                            "flex items-center gap-2 rounded-lg px-4 py-2",
                            "bg-[#1ca9b1] text-white text-sm font-medium",
                            "hover:bg-[#17959c] hover:shadow-md",
                            "transition-all duration-200"
                        )}
                    >
                        <Plus className="h-4 w-4" />
                        <span>New Connection</span>
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
                <div className="w-full px-4 space-y-5">

                    {/* Info banner */}
                    <div className="flex items-start gap-3 p-4 bg-[#e6f7f8] border border-[#1ca9b1]/20 rounded-xl">
                        <Shield className="h-5 w-5 text-[#1ca9b1] shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-medium text-[#3a3a3a]">Protocol Slots</p>
                            <p className="text-xs text-[#727373] mt-0.5">
                                Each slug can have one connection per protocol. Credentials are stored in Vault at{" "}
                                <code className="text-[11px] bg-white px-1.5 py-0.5 rounded border border-[#1ca9b1]/20 font-mono">
                                    credentials/lab_connections/{"{slug}"}/{"{protocol}"}
                                </code>
                            </p>
                        </div>
                    </div>

                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#c4c4c4]" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by slug or title..."
                            className={cn(
                                "w-full rounded-xl border border-[#d4d4d4] bg-white pl-10 pr-4 py-2.5",
                                "text-[13px] text-[#3a3a3a] placeholder:text-[#c4c4c4]",
                                "outline-none focus:border-[#1ca9b1] focus:ring-1 focus:ring-[#1ca9b1]/20 transition-all"
                            )}
                        />
                    </div>

                    {/* Cards Grid */}
                    {isLoading ? (
                        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                            {[1, 2, 3].map((i) => (
                                <div
                                    key={i}
                                    className="border border-[#e8e8e8] rounded-xl bg-white shadow-sm h-64 animate-pulse"
                                />
                            ))}
                        </div>
                    ) : filteredGroups.length === 0 ? (
                        <div className="border border-[#e8e8e8] rounded-xl bg-white shadow-sm p-16 text-center">
                            <div className="w-14 h-14 rounded-full bg-[#f5f5f5] flex items-center justify-center mx-auto mb-4">
                                <Plug className="h-7 w-7 text-[#c4c4c4]" />
                            </div>
                            <h3 className="text-sm font-semibold text-[#3a3a3a]">
                                {searchQuery ? "No matches found" : "No connections yet"}
                            </h3>
                            <p className="text-xs text-[#727373] mt-1 max-w-xs mx-auto">
                                {searchQuery
                                    ? "Try adjusting your search terms"
                                    : "Create your first connection to start managing lab access"}
                            </p>
                            {!searchQuery && (
                                <button
                                    onClick={handleAddNew}
                                    className={cn(
                                        "mt-4 inline-flex items-center gap-2 rounded-lg px-4 py-2",
                                        "bg-[#1ca9b1] text-white text-sm font-medium",
                                        "hover:bg-[#17959c] transition-all"
                                    )}
                                >
                                    <Plus className="h-4 w-4" />
                                    New Connection
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                            {filteredGroups.map((group) => (
                                <LabConnectionCard
                                    key={group.slug}
                                    group={group}
                                    onAdd={handleAddToSlug}
                                    onDelete={handleDelete}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Delete confirmation */}
            {deleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        onClick={() => setDeleteConfirm(null)}
                    />
                    <div className="relative bg-white rounded-xl border border-[#e8e8e8] shadow-xl p-6 w-full max-w-sm mx-4">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
                                <Trash2 className="h-5 w-5 text-red-500" />
                            </div>
                            <div>
                                <h3 className="text-[15px] font-semibold text-[#3a3a3a]">
                                    Remove Connection?
                                </h3>
                                <p className="text-xs text-[#727373] mt-0.5">
                                    {deleteConfirm.title}
                                </p>
                            </div>
                        </div>
                        <p className="text-sm text-[#727373] mb-6">
                            This will permanently delete the connection and its Vault credentials at{" "}
                            <code className="text-[11px] bg-[#f9f9f9] px-1 py-0.5 rounded font-mono">
                                credentials/lab_connections/{deleteConfirm.slug}/{deleteConfirm.protocol}
                            </code>
                        </p>
                        <div className="flex items-center justify-end gap-2">
                            <button
                                onClick={() => setDeleteConfirm(null)}
                                className="px-4 py-2 rounded-lg text-sm font-medium text-[#727373] hover:bg-[#f5f5f5]"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => confirmDelete(deleteConfirm.id)}
                                className="px-4 py-2 rounded-lg text-sm font-medium bg-red-500 text-white hover:bg-red-600"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal */}
            <LabConnectionModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                mode={modalMode}
                connection={selectedConnection}
                prefillSlug={prefillSlug}
                prefillProtocol={prefillProtocol}
                onSubmit={handleSubmit}
                isSubmitting={isSubmitting}
            />
        </div>
    )
}