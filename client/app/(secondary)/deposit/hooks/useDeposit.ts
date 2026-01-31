import { useState, useCallback, useContext, useEffect } from 'react';
import { usePayment } from './usePayment';
import useSendTONTransaction from '@/shared/lib/hooks/useSendTonTransaction';
import { paymentService } from '@/features/payment/payment';
import { useUserStore } from '@/entites/user/model/user';
import { TonConnectUIContext, useTonWallet, useTonAddress } from '@tonconnect/ui-react';
import {
  DEPOSIT_CARDS,
  DEPOSIT_PRESET_AMOUNTS,
  DepositCard,
  DepositCurrencyType,
} from '../helpers/depositConfig';

interface UseDepositReturn {
  cards: DepositCard[];
  activeCard: DepositCard;
  setActiveCard: (card: DepositCard) => void;
  inputValue: number;
  setInputValue: (value: number) => void;
  presetAmounts: number[];
  isProcessing: boolean;
  tonLoading: boolean;
  tonError: string | null;
  handleSubmit: () => Promise<void>;
  walletConnected: boolean;
  handleConnectWallet: () => void;
  walletBalance: number | null;
  insufficientBalance: boolean;
}

async function fetchWalletBalance(address: string): Promise<number | null> {
  try {
    const res = await fetch(`https://tonapi.io/v2/accounts/${address}`);
    if (!res.ok) return null;
    const data = await res.json();
    const balanceNano = data?.balance ?? 0;
    return Number(balanceNano) / 1e9;
  } catch {
    return null;
  }
}

export const useDeposit = (): UseDepositReturn => {
  const ADMIN_WALLET_ADDRESS = process.env.NEXT_PUBLIC_TON_WALLET_ADDRESS;

  const { handlePayment } = usePayment();
  const { updateBalance } = useUserStore();

  const tonConnectUI = useContext(TonConnectUIContext);
  const wallet = useTonWallet();
  const walletAddress = useTonAddress();

  const { sendTransaction, loading: tonLoading, error: tonError } = useSendTONTransaction(
    String(ADMIN_WALLET_ADDRESS || ''),
  );

  const [isProcessing, setIsProcessing] = useState(false);
  const [activeCard, setActiveCard] = useState<DepositCard>(DEPOSIT_CARDS[0]);
  const [inputValue, setInputValue] = useState<number>(1);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);

  const walletConnected = !!wallet;

  // Загружаем баланс кошелька при подключении
  useEffect(() => {
    if (walletAddress) {
      fetchWalletBalance(walletAddress).then(setWalletBalance);
    } else {
      setWalletBalance(null);
    }
  }, [walletAddress]);

  const insufficientBalance =
    activeCard.type === 'ton' &&
    walletConnected &&
    walletBalance !== null &&
    walletBalance < inputValue;

  const handleConnectWallet = useCallback(() => {
    if (!tonConnectUI) return;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ui = tonConnectUI as any;
      ui.openModal?.();
      ui.connectWallet?.();
    } catch (e) {
      console.error('Failed to open TonConnect modal', e);
    }
  }, [tonConnectUI]);

  const handleTonDeposit = useCallback(
    async (amount: number) => {
      if (isProcessing || tonLoading) return;
      if (!ADMIN_WALLET_ADDRESS) {
        alert('TON кошелёк для пополнения не настроен');
        return;
      }

      try {
        setIsProcessing(true);

        const result = await sendTransaction(amount.toString());

        if (result.success) {
          try {
            const depositResult = await paymentService.depositTon(amount);

            if (depositResult.success) {
              updateBalance(amount, 'ton');
              alert(`Баланс успешно пополнен на ${amount} TON!`);
            } else {
              alert('Ошибка при пополнении баланса. Обратитесь в поддержку.');
            }
          } catch (error: any) {
            console.error('Error depositing TON:', error);
            alert(
              'Ошибка при пополнении баланса. Транзакция отправлена, но баланс не обновлен. Обратитесь в поддержку.',
            );
          }
        }
      } catch (error: any) {
        console.error('Error in TON deposit:', error);
        alert(error?.message || 'Ошибка при пополнении TON');
      } finally {
        setIsProcessing(false);
      }
    },
    [ADMIN_WALLET_ADDRESS, isProcessing, tonLoading, sendTransaction, updateBalance],
  );

  const handleSubmit = useCallback(async () => {
    const amount = inputValue;
    if (amount <= 0 || Number.isNaN(amount)) {
      alert('Некорректная сумма пополнения');
      return;
    }

    const type: DepositCurrencyType = activeCard.type;

    if (type === 'stars') {
      await handlePayment(amount, 'stars');
    } else if (type === 'ton') {
      await handleTonDeposit(amount);
    }
  }, [activeCard.type, handlePayment, handleTonDeposit, inputValue]);

  return {
    cards: DEPOSIT_CARDS,
    activeCard,
    setActiveCard,
    inputValue,
    setInputValue,
    presetAmounts: DEPOSIT_PRESET_AMOUNTS,
    isProcessing,
    tonLoading,
    tonError,
    handleSubmit,
    walletConnected,
    handleConnectWallet,
    walletBalance,
    insufficientBalance,
  };
};

