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
 * bodymovin/lottie-web падает внутри completeData/setupAnimation на `.length`,
 * если поля-массивы (assets, chars, markers, shapes, ef, masksProperties и т.д.) — undefined.
 * Нормализуем: гарантируем что все обязательные поля — массивы, рекурсивно по layers/assets.
 */

/** Нормализует один layer: обязательные массивы → [] если отсутствуют или не массив. */
function normalizeLottieLayer(layer: unknown): unknown {
    if (layer == null || typeof layer !== 'object' || Array.isArray(layer)) return layer;
    const l = layer as Record<string, unknown>;
    return {
        ...l,
        shapes: Array.isArray(l.shapes) ? l.shapes : [],
        ef: Array.isArray(l.ef) ? l.ef : [],
        masksProperties: Array.isArray(l.masksProperties) ? l.masksProperties : [],
        tt: l.tt,
    };
}

/** Нормализует один asset (может содержать layers для precomps). */
function normalizeLottieAsset(asset: unknown): unknown {
    if (asset == null || typeof asset !== 'object' || Array.isArray(asset)) return asset;
    const a = asset as Record<string, unknown>;
    if (Array.isArray(a.layers)) {
        return { ...a, layers: a.layers.map(normalizeLottieLayer) };
    }
    return a;
}

export function sanitizeLottieAnimationData(data: unknown): Record<string, unknown> | null {
    if (data == null || typeof data !== 'object' || Array.isArray(data)) {
        return null;
    }

    const raw = data as Record<string, unknown>;
    const layers = raw.layers;
    if (!Array.isArray(layers) || layers.length === 0) {
        return null;
    }

    // Верхний уровень: assets/chars/markers должны быть массивами
    if (raw.assets !== undefined && !Array.isArray(raw.assets)) return null;
    if (raw.chars !== undefined && !Array.isArray(raw.chars)) return null;
    if (raw.markers !== undefined && !Array.isArray(raw.markers)) return null;

    return {
        ...raw,
        // Нормализуем каждый layer
        layers: layers.map(normalizeLottieLayer),
        // Нормализуем assets (precomp-слои тоже могут содержать layers)
        assets: Array.isArray(raw.assets) ? raw.assets.map(normalizeLottieAsset) : [],
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
