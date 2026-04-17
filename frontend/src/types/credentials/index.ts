// src/types/credentials/index.ts

export interface HostInfo {
    esxi_host: string
    username: string
}

export interface CredentialsCreateRequest {
    esxi_host: string
    username: string
    password: string
}

export interface CredentialsUpdateRequest {
    esxi_host: string
    username: string
    password: string
    old_username: string
    old_password: string
}

export interface CredentialsResponse {
    message: string
}

export interface CredentialsFormData {
    esxi_host: string
    username: string
    password: string
    confirm_password: string
}