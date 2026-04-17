'use client';

import { useEffect } from 'react';
import { syncTelegramWebAppModalInsetsAttribute } from '@/shared/lib/telegram/telegramFullscreenDom';

function isMobileUserAgent(): boolean {
  if (typeof navigator === 'undefined') {
    return false;
  }
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

function requestTelegramFullscreen(): void {
  if (!isMobileUserAgent()) {
    return;
  }
  if (typeof window === 'undefined') {
    return;
  }
  if (window.TelegramWebviewProxy) {
    window.TelegramWebviewProxy.postEvent('web_app_request_fullscreen', null);
    return;
  }
  const ext = window.external as { notify?: (message: string) => void } | undefined;
  if (ext && typeof ext.notify === 'function') {
    ext.notify(JSON.stringify({ eventType: 'web_app_request_fullscreen', eventData: null }));
    return;
  }
  window.parent?.postMessage(
    JSON.stringify({ eventType: 'web_app_request_fullscreen', eventData: null }),
    '*'
  );
}

/**
 * Разворачивает WebApp, отключает вертикальные свайпы, запрашивает полноэкранный режим (мобильные),
 * синхронизирует data-tg-webapp-modal-insets для модалок при isExpanded / isFullscreen.
 */
export function TelegramViewportInit() {
  useEffect(() => {
    let disposed = false;
    let innerCleanup: (() => void) | undefined;
    let interval: ReturnType<typeof setInterval> | undefined;
    let maxWait: ReturnType<typeof setTimeout> | undefined;

    const onFullscreenFailed = (error: Record<string, unknown>) => {
      console.warn('Fullscreen request failed:', error);
    };
    const onFullscreenChanged = (_data: Record<string, unknown>) => {
      const webApp = window.Telegram?.WebApp;
      if (!webApp || disposed) return;
      syncTelegramWebAppModalInsetsAttribute(webApp);
    };

    const onViewportChanged = (_data: Record<string, unknown>) => {
      const webApp = window.Telegram?.WebApp;
      if (!webApp || disposed) return;
      syncTelegramWebAppModalInsetsAttribute(webApp);
    };

    const attach = () => {
      const webApp = window.Telegram?.WebApp;
      if (!webApp || disposed) {
        return;
      }

      webApp.disableVerticalSwipes?.();

      if (!webApp.isExpanded) {
        webApp.expand();
      }

      syncTelegramWebAppModalInsetsAttribute(webApp);

      const bumpModalInsets = () => {
        if (disposed) return;
        syncTelegramWebAppModalInsetsAttribute(window.Telegram?.WebApp);
      };

      requestAnimationFrame(bumpModalInsets);

      const onWinResize = () => bumpModalInsets();
      window.addEventListener('resize', onWinResize);
      window.visualViewport?.addEventListener('resize', onWinResize);

      let eventsTimer: ReturnType<typeof setTimeout> | undefined;
      eventsTimer = setTimeout(() => {
        if (disposed) {
          return;
        }
        webApp.onEvent?.('fullscreen_failed', onFullscreenFailed);
        webApp.onEvent?.('fullscreen_changed', onFullscreenChanged);
        webApp.onEvent?.('viewport_changed', onViewportChanged);
      }, 200);

      const recheckDelays = [120, 400, 900] as const;
      const recheckTimers = recheckDelays.map((ms) =>
        setTimeout(bumpModalInsets, ms),
      );

      innerCleanup = () => {
        if (eventsTimer) {
          clearTimeout(eventsTimer);
        }
        recheckTimers.forEach((t) => clearTimeout(t));
        window.removeEventListener('resize', onWinResize);
        window.visualViewport?.removeEventListener('resize', onWinResize);
        webApp.offEvent?.('fullscreen_failed');
        webApp.offEvent?.('fullscreen_changed');
        webApp.offEvent?.('viewport_changed');
      };
    };

    if (window.Telegram?.WebApp) {
      attach();
    } else {
      interval = setInterval(() => {
        if (window.Telegram?.WebApp) {
          if (interval) {
            clearInterval(interval);
          }
          attach();
        }
      }, 100);
      maxWait = setTimeout(() => {
        if (interval) {
          clearInterval(interval);
        }
      }, 5000);
    }

    return () => {
      disposed = true;
      syncTelegramWebAppModalInsetsAttribute(undefined);
      if (interval) {
        clearInterval(interval);
      }
      if (maxWait) {
        clearTimeout(maxWait);
      }
      innerCleanup?.();
    };
  }, []);

  useEffect(() => {
    requestTelegramFullscreen();
  }, []);

  return null;
}
