//create hook for payment and i want that we send user by link
import { useEffect, useRef, useState } from 'react';
import { paymentService } from '@/features/payment/payment';
import { usePaymentStore } from '@/entites/payment/model/payment';

export const usePayment = () => {
    const [isChecking, setIsChecking] = useState(false);
    const lastTransactionIdRef = useRef<string | null>(null);
    const { starsBalance, setStarsBalance } = usePaymentStore();

    // Проверяем баланс и транзакции при монтировании и при возврате на страницу
    useEffect(() => {
        const checkPayment = async () => {
            if (isChecking) return;
            
            try {
                setIsChecking(true);
                const [balance, latestTransaction] = await Promise.all([
                    paymentService.getBalance(),
                    paymentService.getLatestTransaction(),
                ]);

                setStarsBalance(balance.starsBalance);

                // Если появилась новая транзакция после последней проверки, значит платеж успешен
                if (latestTransaction && latestTransaction.id !== lastTransactionIdRef.current) {
                    if (lastTransactionIdRef.current !== null) {
                        console.log(`✅ Платеж успешно обработан! Транзакция: ${latestTransaction.amount} ${latestTransaction.type}`);
                    }
                    lastTransactionIdRef.current = latestTransaction.id;
                } else if (latestTransaction && !lastTransactionIdRef.current) {
                    // Первая загрузка - сохраняем ID последней транзакции
                    lastTransactionIdRef.current = latestTransaction.id;
                }
            } catch (error) {
                console.error('Error checking payment:', error);
            } finally {
                setIsChecking(false);
            }
        };

        // Проверяем сразу при монтировании
        checkPayment();

        // Проверяем при возврате на страницу (visibility change)
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                checkPayment();
            }
        };

        // Проверяем при фокусе окна
        const handleFocus = () => {
            checkPayment();
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('focus', handleFocus);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('focus', handleFocus);
        };
    }, [setStarsBalance, isChecking]);
   
    async function handlePayment(amount: number, type: 'stars') {
        try {
            // Сохраняем текущее состояние перед платежом
            const currentBalance = await paymentService.getBalance();
            const currentTransaction = await paymentService.getLatestTransaction();
            
            setStarsBalance(currentBalance.starsBalance);
            lastTransactionIdRef.current = currentTransaction?.id || null;

            const response = await paymentService.handlePayment(amount, type);
            const link = response.invoiceLink;
            window.location.href = link;
        } catch (error) {
            console.error('Error initiating payment:', error);
            throw error;
        }
    }

    return { handlePayment, isChecking };
}