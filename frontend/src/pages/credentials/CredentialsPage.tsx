// src/pages/credentials/CredentialsPage.tsx
import { useState } from "react"
import { cn } from "@/lib/utils"
import { Shield, Plus } from "lucide-react"
import { useCredentials } from "@/hooks/credentials/useCredentials"
import { CredentialsTable, HostModal } from "@/components/credentials"
import type { HostInfo, CredentialsCreateRequest, CredentialsUpdateRequest } from "@/types/credentials"
import { toast } from "sonner"

export default function CredentialsPage() {
    const { hosts, isLoading, isSubmitting, refetch, createHost, updateHost, deleteHost } = useCredentials()
    const [modalOpen, setModalOpen] = useState(false)
    const [modalMode, setModalMode] = useState<"create" | "edit">("create")
    const [selectedHost, setSelectedHost] = useState<HostInfo | null>(null)
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

    const handleAdd = () => {
        setSelectedHost(null)
        setModalMode("create")
        setModalOpen(true)
    }

    const handleEdit = (host: HostInfo) => {
        setSelectedHost(host)
        setModalMode("edit")
        setModalOpen(true)
    }

    const handleDelete = (host: HostInfo) => {
        setDeleteConfirm(host.esxi_host)
    }

    const confirmDelete = async (hostName: string) => {
        try {
            await deleteHost(hostName)
            setDeleteConfirm(null)
        } catch {
            // Error handled by hook
        }
    }

    const handleSubmit = async (data: CredentialsCreateRequest | CredentialsUpdateRequest) => {
        try {
            if (modalMode === "create") {
                await createHost(data as CredentialsCreateRequest)
                setModalOpen(false)
            } else {
                if (!selectedHost) return
                await updateHost(selectedHost.esxi_host, data as CredentialsUpdateRequest)
                setModalOpen(false)
            }
        } catch {
            // Error handled by hook (toast shown)
        }
    }

    return (
        <div className="flex flex-col h-full bg-[#f9f9f9]">
            {/* Header */}
            <div className="bg-white border-b border-[#e8e8e8] px-6 py-5 shrink-0">
                <div className="flex items-center justify-between w-full px-4">
                    <div>
                        <h1 className="text-xl font-semibold text-[#3a3a3a]">
                            Host Credentials
                        </h1>
                        <p className="text-sm text-[#727373] mt-0.5">
                            Securely manage ESXi host credentials in Vault
                        </p>
                    </div>

                    <button
                        onClick={handleAdd}
                        className={cn(
                            "flex items-center gap-2 rounded-lg px-4 py-2",
                            "bg-[#1ca9b1] text-white text-sm font-medium",
                            "hover:bg-[#17959c] hover:shadow-md",
                            "transition-all duration-200"
                        )}
                    >
                        <Plus className="h-4 w-4" />
                        <span>Add Host</span>
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
                <div className="w-full px-4 space-y-4">
                    {/* Info banner */}
                    <div className="flex items-start gap-3 p-4 bg-[#e6f7f8] border border-[#1ca9b1]/20 rounded-lg">
                        <Shield className="h-5 w-5 text-[#1ca9b1] shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-medium text-[#3a3a3a]">Secure Storage</p>
                            <p className="text-xs text-[#727373] mt-0.5">
                                Passwords are encrypted at rest in HashiCorp Vault. Only hostnames and usernames are displayed.
                            </p>
                        </div>
                    </div>

                    <CredentialsTable
                        hosts={hosts}
                        isLoading={isLoading}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                    />

                    {/* Delete confirmation inline */}
                    {deleteConfirm && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center">
                            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)} />
                            <div className="relative bg-white rounded-xl border border-[#e8e8e8] shadow-xl p-6 w-full max-w-sm mx-4">
                                <h3 className="text-[15px] font-semibold text-[#3a3a3a] mb-2">Remove Host?</h3>
                                <p className="text-sm text-[#727373] mb-6">
                                    This will permanently delete credentials for <span className="font-medium text-[#3a3a3a]">{deleteConfirm}</span> from Vault.
                                </p>
                                <div className="flex items-center justify-end gap-2">
                                    <button
                                        onClick={() => setDeleteConfirm(null)}
                                        className="px-4 py-2 rounded-lg text-sm font-medium text-[#727373] hover:bg-[#f5f5f5]"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => confirmDelete(deleteConfirm)}
                                        className="px-4 py-2 rounded-lg text-sm font-medium bg-red-500 text-white hover:bg-red-600"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal */}
            <HostModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                mode={modalMode}
                host={selectedHost}
                onSubmit={handleSubmit}
                isSubmitting={isSubmitting}
            />
        </div>
    )
}