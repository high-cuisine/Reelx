'use client';

import { useSearchParams } from 'next/navigation';

export function useTableOwnerId(): string | null {
    const searchParams = useSearchParams();
    return searchParams.get('owner');
}
