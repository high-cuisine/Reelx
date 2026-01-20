import { useState, useEffect } from 'react';

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

  return {
    username,
    usernameInitial,
    photoUrl,
    isLoaded,
    initData
  };
};

