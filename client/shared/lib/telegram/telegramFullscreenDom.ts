/**
 * Маркер на <html> для CSS модалок: только когда WebApp в нативном fullscreen
 * (событие fullscreen_changed / поле isFullscreen в свежих клиентах Telegram).
 */
export function applyTelegramAppFullscreenToDom(isFullscreen: boolean): void {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    if (isFullscreen) {
        root.dataset.tgAppFullscreen = '1';
    } else {
        delete root.dataset.tgAppFullscreen;
    }
}

export function readTelegramWebAppIsFullscreen(
    webApp: NonNullable<NonNullable<Window['Telegram']>['WebApp']>,
): boolean | null {
    const v = (webApp as { isFullscreen?: boolean }).isFullscreen;
    return typeof v === 'boolean' ? v : null;
}

export function parseFullscreenChangedPayload(data: Record<string, unknown> | undefined): boolean | null {
    const v = data?.is_fullscreen ?? data?.isFullscreen;
    if (typeof v === 'boolean') return v;
    return null;
}
