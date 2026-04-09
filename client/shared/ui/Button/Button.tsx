'use client'
import cls from './Button.module.scss';

interface ButtonProps {
    text: string;
    customClass?: string
    disabled?: boolean
    loading?: boolean
    loadingText?: string
    onClick?: React.MouseEventHandler<HTMLButtonElement>
    type?: 'button' | 'submit' | 'reset'
}

const Button = ({
    text,
    customClass,
    disabled,
    loading,
    loadingText,
    onClick,
    type = 'button',
}: ButtonProps) => {
    const isDisabled = Boolean(disabled || loading);

    return (
        <button
            type={type}
            className={`${cls.button} ${customClass ?? ''}`}
            onClick={onClick}
            disabled={isDisabled}
            aria-disabled={isDisabled}
        >
            {loading ? (loadingText ?? 'Загрузка...') : text}
        </button>
    );
}

export { Button }