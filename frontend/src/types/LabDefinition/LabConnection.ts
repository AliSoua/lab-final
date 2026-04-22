// src/types/LabDefinition/LabConnection.ts
export type ConnectionProtocol = "ssh" | "rdp" | "vnc"

export const PROTOCOLS: ConnectionProtocol[] = ["ssh", "rdp", "vnc"]

export interface LabConnectionBase {
    slug: string
    title: string
    protocol: ConnectionProtocol
    port: number
    config: Record<string, unknown>
    order: number
}

export interface LabConnectionCreateRequest extends LabConnectionBase {
    username: string
    password: string
}

export interface LabConnectionUpdateRequest {
    slug?: string
    title?: string
    port?: number
    config?: Record<string, unknown>
    order?: number
    username?: string
    password?: string
}

export interface LabConnectionResponse extends LabConnectionBase {
    id: string
    created_at: string
    updated_at: string
}

export interface LabConnectionListItem {
    id: string
    slug: string
    title: string
    protocol: ConnectionProtocol
    port: number
    order: number
}

export interface LabConnectionGroupedItem {
    slug: string
    connections: LabConnectionListItem[]
}

export interface LabConnectionDetailResponse extends LabConnectionResponse {
    vault_path: string
    username: string | null
}

export interface LabConnectionFormData {
    slug: string
    title: string
    protocol: ConnectionProtocol
    port: number
    config: Record<string, unknown>
    order: number
    username: string
    password: string
    confirm_password: string
}