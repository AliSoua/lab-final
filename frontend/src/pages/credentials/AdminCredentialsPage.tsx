// src/pages/credentials/AdminCredentialsPage.tsx
import { useState } from "react"
import { cn } from "@/lib/utils"
import { Shield, Plus } from "lucide-react"
import { useAdminCredentials } from "@/hooks/credentials/useAdminCredentials"
import { CredentialsTable } from "@/components/credentials/admin/CredentialsTable"
import { VCenterModal } from "@/components/credentials/admin/VCenterModal"
import type { VCenterInfo, VCenterCredentialsCreateRequest, VCenterCredentialsUpdateRequest } from "@/types/credentials/admin"

export default function AdminCredentialsPage() {
    const { vcenters, isLoading, isSubmitting, refetch, createVCenter, updateVCenter, deleteVCenter } = useAdminCredentials()
    const [modalOpen, setModalOpen] = useState(false)
    const [modalMode, setModalMode] = useState<"create" | "edit">("create")
    const [selectedVCenter, setSelectedVCenter] = useState<VCenterInfo | null>(null)
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

    const handleAdd = () => {
        setSelectedVCenter(null)
        setModalMode("create")
        setModalOpen(true)
    }

    const handleEdit = (vcenter: VCenterInfo) => {
        setSelectedVCenter(vcenter)
        setModalMode("edit")
        setModalOpen(true)
    }

    const handleDelete = (vcenter: VCenterInfo) => {
        setDeleteConfirm(vcenter.vcenter_host)
    }

    const confirmDelete = async (hostName: string) => {
        try {
            await deleteVCenter(hostName)
            setDeleteConfirm(null)
        } catch {
            // Error handled by hook
        }
    }

    const handleSubmit = async (data: VCenterCredentialsCreateRequest | VCenterCredentialsUpdateRequest) => {
        try {
            if (modalMode === "create") {
                await createVCenter(data as VCenterCredentialsCreateRequest)
                setModalOpen(false)
            } else {
                if (!selectedVCenter) return
                await updateVCenter(selectedVCenter.vcenter_host, data as VCenterCredentialsUpdateRequest)
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
                            vCenter Credentials
                        </h1>
                        <p className="text-sm text-[#727373] mt-0.5">
                            Securely manage vCenter Server credentials in Vault
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
                        <span>Add vCenter</span>
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
                        VCenters={vcenters}
                        isLoading={isLoading}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                    />

                    {/* Delete confirmation inline */}
                    {deleteConfirm && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center">
                            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)} />
                            <div className="relative bg-white rounded-xl border border-[#e8e8e8] shadow-xl p-6 w-full max-w-sm mx-4">
                                <h3 className="text-[15px] font-semibold text-[#3a3a3a] mb-2">Remove vCenter?</h3>
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
            <VCenterModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                mode={modalMode}
                vcenter={selectedVCenter}
                onSubmit={handleSubmit}
                isSubmitting={isSubmitting}
            />
        </div>
    )
}