export function formatTableGameId(ownerId: string | null): string {
    return ownerId ? `#${ownerId.slice(0, 8)}` : '#—';
}

export function formatOwnerHashShort(ownerId: string | null): string {
    if (!ownerId) return '—';
    return `${ownerId.slice(0, 6)}…${ownerId.slice(-4)}`;
}

export function copyOwnerIdToClipboard(ownerId: string | null): void {
    if (ownerId) void navigator.clipboard.writeText(ownerId);
}
