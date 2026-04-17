'use client';

import { useEffect } from 'react';
import {
    applyTelegramAppFullscreenToDom,
    parseFullscreenChangedPayload,
    readTelegramWebAppIsFullscreen,
} from '@/shared/lib/telegram/telegramFullscreenDom';

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
 * подписки на события fullscreen — по образцу SPA с Telegram.
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
    const onFullscreenChanged = (data: Record<string, unknown>) => {
      const next = parseFullscreenChangedPayload(data);
      if (next !== null) {
        applyTelegramAppFullscreenToDom(next);
      }
    };

    const attach = () => {
      const webApp = window.Telegram?.WebApp;
      if (!webApp || disposed) {
        return;
      }

      webApp.disableVerticalSwipes?.();

      const initialFs = readTelegramWebAppIsFullscreen(webApp);
      if (initialFs !== null) {
        applyTelegramAppFullscreenToDom(initialFs);
      }

      if (!webApp.isExpanded) {
        webApp.expand();
      }

      let eventsTimer: ReturnType<typeof setTimeout> | undefined;
      if (isMobileUserAgent()) {
        eventsTimer = setTimeout(() => {
          if (disposed) {
            return;
          }
          webApp.onEvent?.('fullscreen_failed', onFullscreenFailed);
          webApp.onEvent?.('fullscreen_changed', onFullscreenChanged);
        }, 200);
      }

      const recheckFsTimer = setTimeout(() => {
        if (disposed) {
          return;
        }
        const again = readTelegramWebAppIsFullscreen(webApp);
        if (again !== null) {
          applyTelegramAppFullscreenToDom(again);
        }
      }, 900);

      innerCleanup = () => {
        if (eventsTimer) {
          clearTimeout(eventsTimer);
        }
        clearTimeout(recheckFsTimer);
        webApp.offEvent?.('fullscreen_failed');
        webApp.offEvent?.('fullscreen_changed');
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
      applyTelegramAppFullscreenToDom(false);
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
