/**
 * Базовый origin бэкенда с Socket.IO (тот же хост, что и REST API).
 * В dev Next и API часто на разных портах — задаётся NEXT_PUBLIC_API_URL.
 */
export function getSocketBaseUrl(): string {
    if (typeof window === 'undefined') return '';
    const env = process.env.NEXT_PUBLIC_API_URL;
    if (env && env.length > 0) {
        return env.replace(/\/$/, '');
    }
    return window.location.origin;
}
