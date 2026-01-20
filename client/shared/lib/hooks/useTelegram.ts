import { useState, useEffect, useRef, useContext } from 'react';
import { TonConnectUIContext, useTonWallet } from '@tonconnect/ui-react';

interface TelegramUser {
  id: number;
  first_name: string;
  username?: string;
  photo_url?: string;
}

interface UseTelegramReturn {
  username: string | null;
  usernameInitial: string;
  photoUrl: string | null;
  isLoaded: boolean;
  initData: string | null;
}

export const useTelegram = (): UseTelegramReturn => {
  const [usernameInitial, setUsernameInitial] = useState('T'); // fallback
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [initData, setInitData] = useState<string | null>(null);

  const tonConnectUI = useContext(TonConnectUIContext);
  const wallet = useTonWallet();
  const didOpenTonConnectRef = useRef(false);

  useEffect(() => {
    const initTelegram = () => {
      if (typeof window === 'undefined' || !window.Telegram?.WebApp) {
        return;
      }

      // Вызываем ready() для инициализации WebApp
      window.Telegram.WebApp.ready();

      const user = window.Telegram.WebApp.initDataUnsafe?.user as TelegramUser | undefined;
      if (user) {
        const userUsername = user.username || user.first_name || 'T';
        const initial = userUsername.slice(0, 1).toUpperCase();
        setUsernameInitial(initial);
        setUsername(userUsername);
        setPhotoUrl(user.photo_url || null);
        setIsLoaded(true);
        setInitData(window.Telegram.WebApp.initData);
      }
    };

    // Проверяем сразу и при загрузке скрипта
    if (typeof window !== 'undefined') {
      if (document.readyState === 'complete') {
        initTelegram();
      } else {
        window.addEventListener('load', initTelegram);
      }

      // Также проверяем через интервал на случай, если скрипт загрузится позже
      const checkInterval = setInterval(() => {
        if (window.Telegram?.WebApp) {
          clearInterval(checkInterval);
          initTelegram();
        }
      }, 100);

      // Очищаем интервал через 5 секунд
      setTimeout(() => {
        clearInterval(checkInterval);
      }, 5000);

      return () => {
        window.removeEventListener('load', initTelegram);
        clearInterval(checkInterval);
      };
    }
  }, []);

  // Автоматически открываем TonConnect, если кошелёк не подключен
  useEffect(() => {
    if (!isLoaded) return; // ждём инициализацию Telegram WebApp (чтобы не мешать SSR/обычному браузеру)
    if (!tonConnectUI) return;
    if (wallet) return;
    if (didOpenTonConnectRef.current) return;

    didOpenTonConnectRef.current = true;

    try {
      // TonConnect UI модалка
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (tonConnectUI as any).openModal?.();
    } catch (e) {
      // Если openModal недоступен — просто игнорируем, пользователь подключит вручную
      // console.warn('Failed to auto-open TonConnect modal', e);
    }
  }, [isLoaded, tonConnectUI, wallet]);

  return {
    username,
    usernameInitial,
    photoUrl,
    isLoaded,
    initData
  };
};

