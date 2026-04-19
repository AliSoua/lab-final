// frontend/src/types/credentials/admin.ts
export interface VCenterInfo {
    vcenter_host: string
    username: string
}

export interface VCenterCredentialsCreateRequest {
    vcenter_host: string
    username: string
    password: string
}

export interface VCenterCredentialsUpdateRequest {
    vcenter_host: string
    username: string
    password: string
    old_username: string
    old_password: string
}

export interface VCenterCredentialsResponse {
    message: string
}

export interface VCenterCredentialsFormData {
    vcenter_host: string
    username: string
    password: string
    confirm_password: string
}