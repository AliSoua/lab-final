// src/hooks/labs/useLabs.ts
/**
 * React Query hooks for fetching lab data
 */

import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import type {
    UseQueryOptions,
    UseQueryResult,
} from '@tanstack/react-query';
import {
    fetchLabs,
    fetchLabDetail,
    fetchCategories,
    fetchTracks,
    checkLabSlugAvailability,
} from '@/api/endpoints/labs';
import type {
    LabListItem,
    LabDetailResponse,
    LabPaginatedResponse,
    FetchLabsParams,
    LabCategory,
    LabTrack,
} from '@/types/labs';

// =============================================================================
// Query Keys
// =============================================================================

export const LAB_QUERY_KEYS = {
    all: ['labs'] as const,
    lists: () => [...LAB_QUERY_KEYS.all, 'list'] as const,
    list: (filters: FetchLabsParams) => [...LAB_QUERY_KEYS.lists(), filters] as const,
    details: () => [...LAB_QUERY_KEYS.all, 'detail'] as const,
    detail: (idOrSlug: string) => [...LAB_QUERY_KEYS.details(), idOrSlug] as const,
    categories: () => [...LAB_QUERY_KEYS.all, 'categories'] as const,
    tracks: () => [...LAB_QUERY_KEYS.all, 'tracks'] as const,
    slugCheck: (slug: string) => [...LAB_QUERY_KEYS.all, 'slug-check', slug] as const,
};

// =============================================================================
// List Hooks
// =============================================================================

interface UseLabsOptions {
    filters?: FetchLabsParams;
    enabled?: boolean;
    placeholderData?: LabPaginatedResponse;
}

/**
 * Hook for fetching paginated labs list with filters
 * Uses keepPreviousData for smooth pagination
 */
export function useLabs(options: UseLabsOptions = {}) {
    const { filters = {}, enabled = true, placeholderData } = options;

    return useQuery<LabPaginatedResponse>({
        queryKey: LAB_QUERY_KEYS.list(filters),
        queryFn: () => fetchLabs(filters),
        enabled,
        placeholderData: placeholderData ?? keepPreviousData,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
}

/**
 * Hook for fetching lab categories (for filters/dropdowns)
 */
export function useLabCategories(options?: UseQueryOptions<LabCategory[], Error>) {
    return useQuery<LabCategory[], Error>({
        queryKey: LAB_QUERY_KEYS.categories(),
        queryFn: fetchCategories,
        staleTime: 10 * 60 * 1000, // 10 minutes - categories rarely change
        ...options,
    });
}

/**
 * Hook for fetching learning tracks
 */
export function useLabTracks(options?: UseQueryOptions<LabTrack[], Error>) {
    return useQuery<LabTrack[], Error>({
        queryKey: LAB_QUERY_KEYS.tracks(),
        queryFn: fetchTracks,
        staleTime: 10 * 60 * 1000,
        ...options,
    });
}

// =============================================================================
// Detail Hooks
// =============================================================================

interface UseLabDetailOptions {
    idOrSlug: string | undefined;
    enabled?: boolean;
}

/**
 * Hook for fetching single lab detail
 * Prefetches related data for better UX
 */
export function useLabDetail(options: UseLabDetailOptions) {
    const { idOrSlug, enabled = true } = options;
    const queryClient = useQueryClient();

    const query = useQuery<LabDetailResponse>({
        queryKey: LAB_QUERY_KEYS.detail(idOrSlug || ''),
        queryFn: () => fetchLabDetail(idOrSlug!),
        enabled: !!idOrSlug && enabled,
        staleTime: 2 * 60 * 1000, // 2 minutes
    });

    // Prefetch next/prev lab if available (optimization for navigation)
    // This is a pattern you can implement when you have navigation buttons
    return query;
}

// =============================================================================
// Validation Hooks
// =============================================================================

interface UseLabSlugCheckOptions {
    slug: string;
    excludeId?: string;
    enabled?: boolean;
    debounceMs?: number;
}

/**
 * Hook for checking slug availability with debouncing
 */
export function useLabSlugCheck(options: UseLabSlugCheckOptions) {
    const { slug, excludeId, enabled = true } = options;

    // Only check if slug is valid format and long enough
    const shouldCheck = enabled && slug.length >= 3 && /^[a-z0-9-]+$/.test(slug);

    return useQuery({
        queryKey: LAB_QUERY_KEYS.slugCheck(slug),
        queryFn: () => checkLabSlugAvailability(slug, excludeId),
        enabled: shouldCheck,
        staleTime: Infinity, // Don't refetch automatically
        retry: false,
    });
}

/**
 * Utility to prefetch lab details (useful for hover states or navigation)
 */
export function usePrefetchLab() {
    const queryClient = useQueryClient();

    return (idOrSlug: string) => {
        queryClient.prefetchQuery({
            queryKey: LAB_QUERY_KEYS.detail(idOrSlug),
            queryFn: () => fetchLabDetail(idOrSlug),
            staleTime: 2 * 60 * 1000,
        });
    };
}

/**
 * Utility to invalidate lab lists (call after mutations)
 */
export function useInvalidateLabs() {
    const queryClient = useQueryClient();

    return {
        invalidateLists: () => {
            queryClient.invalidateQueries({ queryKey: LAB_QUERY_KEYS.lists() });
        },
        invalidateDetail: (idOrSlug: string) => {
            queryClient.invalidateQueries({ queryKey: LAB_QUERY_KEYS.detail(idOrSlug) });
        },
        invalidateAll: () => {
            queryClient.invalidateQueries({ queryKey: LAB_QUERY_KEYS.all });
        },
    };
}