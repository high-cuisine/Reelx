export function normalizeMediaUrl(url: string): string {
    const trimmed = url.trim();
    if (trimmed.startsWith('ipfs://')) {
        const hash = trimmed.replace('ipfs://', '');
        return `https://cloudflare-ipfs.com/ipfs/${hash}`;
    }
    if (trimmed.startsWith('//')) return `https:${trimmed}`;
    if (trimmed.startsWith('http://')) return trimmed.replace(/^http:\/\//, 'https://');
    return trimmed;
}

/**
 * bodymovin/lottie-web иногда падает внутри completeData на `.length`,
 * если пришёл нетипичный JSON (например, без массивов assets/chars/markers).
 * Нормализуем и отбрасываем неподходящие данные.
 */
export function sanitizeLottieAnimationData(data: unknown): Record<string, unknown> | null {
    if (data == null || typeof data !== 'object' || Array.isArray(data)) {
        return null;
    }

    const raw = data as Record<string, unknown>;
    const layers = raw.layers;
    if (!Array.isArray(layers) || layers.length === 0) {
        return null;
    }

    if (raw.assets !== undefined && !Array.isArray(raw.assets)) {
        return null;
    }
    if (raw.chars !== undefined && !Array.isArray(raw.chars)) {
        return null;
    }
    if (raw.markers !== undefined && !Array.isArray(raw.markers)) {
        return null;
    }

    return {
        ...raw,
        assets: Array.isArray(raw.assets) ? raw.assets : [],
        chars: Array.isArray(raw.chars) ? raw.chars : [],
        markers: Array.isArray(raw.markers) ? raw.markers : [],
    };
}

export async function fetchSafeLottieAnimation(url: string): Promise<Record<string, unknown> | null> {
    const response = await fetch(normalizeMediaUrl(url));
    if (!response.ok) {
        throw new Error(`Lottie HTTP ${response.status}`);
    }
    const data = (await response.json()) as unknown;
    return sanitizeLottieAnimationData(data);
}
