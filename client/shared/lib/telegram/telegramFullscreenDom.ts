export type TelegramWebAppLike = NonNullable<NonNullable<Window['Telegram']>['WebApp']>;

/**
 * Маркер `data-tg-webapp-modal-insets` на <html> для fixed-модалок.
 * В Telegram `position: fixed` привязан к viewport и не учитывает padding у body,
 * поэтому при развёрнутом мини-приложении (`isExpanded`) и/или нативном fullscreen
 * подрезаем модалки по safe area (см. globals.css + *.module.scss).
 */
export function syncTelegramWebAppModalInsetsAttribute(webApp: TelegramWebAppLike | undefined): void {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    if (!webApp) {
        delete root.dataset.tgWebappModalInsets;
        delete root.dataset.tgWebappFullscreen;
        return;
    }
    const expRaw = (webApp as { isExpanded?: boolean }).isExpanded;
    /** В старых клиентах поля нет — ведём себя как при развёрнутом WebApp, иначе fixed-модалки залезают под вырезы. */
    const expanded = typeof expRaw === 'boolean' ? expRaw : true;
    const fs = (webApp as { isFullscreen?: boolean }).isFullscreen === true;
    if (fs) {
        root.dataset.tgWebappFullscreen = '1';
    } else {
        delete root.dataset.tgWebappFullscreen;
    }
    if (expanded || fs) {
        root.dataset.tgWebappModalInsets = '1';
    } else {
        delete root.dataset.tgWebappModalInsets;
    }
}
