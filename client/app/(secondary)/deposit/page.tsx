'use client';

import cls from './deposit.module.scss';
import { Button } from '@/shared/ui/Button/Button';
import { useDeposit } from './hooks/useDeposit';
import { DepositCards } from './components/DepositCards';
import { DepositAmountInput } from './components/DepositAmountInput';
import { DepositPresetButtons } from './components/DepositPresetButtons';

const DepositPage = () => {
  const {
    cards,
    activeCard,
    setActiveCard,
    inputValue,
    setInputValue,
    presetAmounts,
    isProcessing,
    tonLoading,
    tonError,
    handleSubmit,
    walletConnected,
    handleConnectWallet,
    walletBalance,
    insufficientBalance,
  } = useDeposit();

  const isDisabled = isProcessing || tonLoading || insufficientBalance;

  return (
    <div className={cls.deposit}>
      <a className={cls.close} href="/profile">
        <svg width="8" height="8" viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M5.15672 4L7.76021 6.60349C8.07916 6.92243 8.08099 7.4377 7.75935 7.75935C7.43993 8.07876 6.92218 8.0789 6.60349 7.76021L4 5.15672L1.39651 7.76021C1.07757 8.07915 0.562301 8.08099 0.240654 7.75935C-0.078766 7.43993 -0.0788967 6.92217 0.239788 6.60349L2.84328 4L0.239788 1.39651C-0.0791539 1.07757 -0.080993 0.562301 0.240654 0.240654C0.560074 -0.078766 1.07783 -0.0788966 1.39651 0.239788L4 2.84328L6.60349 0.239788C6.92243 -0.0791538 7.4377 -0.0809929 7.75935 0.240654C8.07877 0.560074 8.0789 1.07783 7.76021 1.39651L5.15672 4Z"
            fill="white"
          />
        </svg>
      </a>

      <h2 className={cls.header}>Депозит</h2>

      <DepositCards cards={cards} activeCard={activeCard} onSelect={setActiveCard} />

      <DepositAmountInput activeCard={activeCard} value={inputValue} onChange={setInputValue} />

      <DepositPresetButtons amounts={presetAmounts} onSelect={setInputValue} />

      {activeCard.type === 'ton' && !walletConnected && (
        <div
          style={{ marginBottom: '10px' }}
          onClick={() => {
            if (!isDisabled) {
              handleConnectWallet();
            }
          }}
        >
          <Button customClass={cls.depositButton} text="Подключить TON кошелёк" />
        </div>
      )}

      {/* Кнопка пополнения скрыта, если выбран TON и кошелёк не подключен */}
      {!(activeCard.type === 'ton' && !walletConnected) && (
        <div
          onClick={() => {
            if (!isDisabled) {
              handleSubmit();
            }
          }}
          style={{
            opacity: isDisabled ? 0.6 : 1,
            cursor: isDisabled ? 'not-allowed' : 'pointer',
          }}
        >
          <Button
            customClass={cls.depositButton}
            text={isDisabled ? 'Обработка...' : `Пополнить на ${inputValue} ${activeCard.item}`}
          />
        </div>
      )}

      {activeCard.type === 'ton' && walletConnected && walletBalance !== null && (
        <div style={{ marginTop: '12px', textAlign: 'center', fontSize: '12px', color: '#aaa' }}>
          Баланс кошелька: {walletBalance.toFixed(2)} TON
        </div>
      )}

      {insufficientBalance && (
        <div style={{ color: '#ff6b6b', marginTop: '8px', textAlign: 'center', fontSize: '13px' }}>
          Недостаточно средств на кошельке
        </div>
      )}

      {tonError && (
        <div style={{ color: 'red', marginTop: '16px', textAlign: 'center' }}>{tonError}</div>
      )}
    </div>
  );
};

export default DepositPage;