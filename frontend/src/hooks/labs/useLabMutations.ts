// src/hooks/labs/useLabMutations.ts
/**
 * React Query mutations for lab CRUD operations
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationOptions } from '@tanstack/react-query';
import {
    createLab,
    updateLab,
    deleteLab,
    publishLab,
    archiveLab,
    validateLab,
} from '@/api/endpoints/labs';
import type {
    LabCreate,
    LabUpdate,
    LabDetailResponse,
    CreateLabFormData,
} from '@/types/labs';
import { transformFormDataToApiPayload } from '@/types/labs';
import { LAB_QUERY_KEYS } from './useLabs';
import { useInvalidateLabs } from './useLabs';

// =============================================================================
// Create Lab
// =============================================================================

interface CreateLabVariables {
    data: CreateLabFormData;
}

/**
 * Mutation hook for creating a new lab
 * Invalidates lab lists on success
 */
export function useCreateLab(
    options?: UseMutationOptions<LabDetailResponse, Error, CreateLabVariables>
) {
    const queryClient = useQueryClient();
    const { invalidateLists } = useInvalidateLabs();

    return useMutation<LabDetailResponse, Error, CreateLabVariables>({
        mutationFn: async ({ data }) => {
            const payload = transformFormDataToApiPayload(data);
            return createLab(payload);
        },
        onSuccess: (data, variables, context) => {
            // Invalidate lists to show new lab
            invalidateLists();

            // Pre-cache the detail view
            queryClient.setQueryData(LAB_QUERY_KEYS.detail(data.id), data);
            queryClient.setQueryData(LAB_QUERY_KEYS.detail(data.slug), data);

            options?.onSuccess?.(data, variables, context);
        },
        ...options,
    });
}

// =============================================================================
// Update Lab
// =============================================================================

interface UpdateLabVariables {
    id: string;
    data: LabUpdate;
}

/**
 * Mutation hook for updating an existing lab
 * Optimistically updates the cache
 */
export function useUpdateLab(
    options?: UseMutationOptions<LabDetailResponse, Error, UpdateLabVariables>
) {
    const queryClient = useQueryClient();
    const { invalidateLists, invalidateDetail } = useInvalidateLabs();

    return useMutation<LabDetailResponse, Error, UpdateLabVariables>({
        mutationFn: ({ id, data }) => updateLab(id, data),
        onMutate: async ({ id, data }) => {
            // Cancel outgoing refetches
            await queryClient.cancelQueries({ queryKey: LAB_QUERY_KEYS.detail(id) });

            // Snapshot previous value
            const previousLab = queryClient.getQueryData<LabDetailResponse>(
                LAB_QUERY_KEYS.detail(id)
            );

            // Optimistically update
            if (previousLab) {
                queryClient.setQueryData<LabDetailResponse>(
                    LAB_QUERY_KEYS.detail(id),
                    { ...previousLab, ...data }
                );
            }

            return { previousLab };
        },
        onError: (err, variables, context) => {
            // Rollback on error
            if (context?.previousLab) {
                queryClient.setQueryData(
                    LAB_QUERY_KEYS.detail(variables.id),
                    context.previousLab
                );
            }
            options?.onError?.(err, variables, context);
        },
        onSuccess: (data, variables, context) => {
            // Update cache with server data
            queryClient.setQueryData(LAB_QUERY_KEYS.detail(variables.id), data);
            queryClient.setQueryData(LAB_QUERY_KEYS.detail(data.slug), data);

            invalidateLists();
            options?.onSuccess?.(data, variables, context);
        },
        ...options,
    });
}

// =============================================================================
// Delete Lab
// =============================================================================

/**
 * Mutation hook for deleting a lab
 */
export function useDeleteLab(
    options?: UseMutationOptions<void, Error, string>
) {
    const { invalidateLists, invalidateAll } = useInvalidateLabs();

    return useMutation<void, Error, string>({
        mutationFn: deleteLab,
        onSuccess: (_, labId, context) => {
            // Remove from cache
            // queryClient.removeQueries({ queryKey: LAB_QUERY_KEYS.detail(labId) });

            invalidateLists();
            invalidateAll();

            options?.onSuccess?.(_, labId, context);
        },
        ...options,
    });
}

// =============================================================================
// Publish Lab
// =============================================================================

interface PublishLabVariables {
    id: string;
    validate?: boolean;
}

/**
 * Mutation hook for publishing a lab
 */
export function usePublishLab(
    options?: UseMutationOptions<LabDetailResponse, Error, PublishLabVariables>
) {
    const { invalidateLists, invalidateDetail } = useInvalidateLabs();

    return useMutation<LabDetailResponse, Error, PublishLabVariables>({
        mutationFn: ({ id, validate = true }) => publishLab(id, validate),
        onSuccess: (data, variables, context) => {
            invalidateDetail(variables.id);
            invalidateLists();
            options?.onSuccess?.(data, variables, context);
        },
        ...options,
    });
}

// =============================================================================
// Archive Lab
// =============================================================================

/**
 * Mutation hook for archiving a lab
 */
export function useArchiveLab(
    options?: UseMutationOptions<LabDetailResponse, Error, string>
) {
    const { invalidateLists, invalidateDetail } = useInvalidateLabs();

    return useMutation<LabDetailResponse, Error, string>({
        mutationFn: archiveLab,
        onSuccess: (data, labId, context) => {
            invalidateDetail(labId);
            invalidateLists();
            options?.onSuccess?.(data, labId, context);
        },
        ...options,
    });
}

// =============================================================================
// Validate Lab
// =============================================================================

/**
 * Mutation hook for validating lab configuration
 * Used before publishing to check for errors
 */
export function useValidateLab(
    options?: UseMutationOptions<
        { valid: boolean; errors: Record<string, string[]>; warnings: Record<string, string[]> },
        Error,
        string
    >
) {
    return useMutation({
        mutationFn: validateLab,
        ...options,
    });
}