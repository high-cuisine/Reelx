'use client';

import cls from '../deposit.module.scss';

interface DepositPresetButtonsProps {
  amounts: number[];
  onSelect: (amount: number) => void;
  disabled?: boolean;
}

export const DepositPresetButtons: React.FC<DepositPresetButtonsProps> = ({
  amounts,
  onSelect,
  disabled,
}) => {
  return (
    <div className={cls.buttons}>
      {amounts.map((el) => (
        <button
          key={el}
          className={cls.button}
          onClick={() => onSelect(el)}
          disabled={disabled}
        >
          {el}
        </button>
      ))}
    </div>
  );
};

