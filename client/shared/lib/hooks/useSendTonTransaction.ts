import { useContext, useEffect, useState } from 'react';
import { SendTransactionRequest } from '@tonconnect/sdk';
import { useTonWallet, TonConnectUIContext, useTonAddress } from '@tonconnect/ui-react';

const useSendTONTransaction = (adminAddress: string) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const tonConnectUI = useContext(TonConnectUIContext);
  const wallet = useTonWallet();
  const addr = useTonAddress();
  console.log("ADDRESS: ", addr);

  useEffect(() => {
    if (!tonConnectUI) return;

    const handleConnection = (wallet: any) => {
      console.log("Wallet connected:", wallet);
    };

    const unsubscribe = tonConnectUI.onStatusChange(handleConnection);
    return () => {
      unsubscribe();
    };
  }, [tonConnectUI]);



  const sendTransaction = async (amount: string) => {
    setLoading(true);
    setError(null);

    try {
      if (!tonConnectUI) {
        throw new Error("TonConnectUI is not initialized");
      }

      if (!wallet) {
        throw new Error("Wallet is not connected");
      }

      const amountTON = parseFloat(amount);
      if (isNaN(amountTON) || amountTON <= 0) {
        throw new Error("Invalid amount");
      }

      const amountNano = BigInt(amountTON * 1e9).toString();

      const transaction: SendTransactionRequest = {
        validUntil: Math.floor(Date.now() / 1000) + 300, // Транзакция действительна 5 минут
        messages: [
          {
            address: adminAddress,
            amount: amountNano,
          }
        ]
      };

      const result = await tonConnectUI.sendTransaction(transaction);

      console.log("Transaction successfully sent", result);
      return { success: true, result };
    } catch (error) {
      const errorMessage = (error as Error).message;
      setError(errorMessage);
      console.error("Error sending transaction:", error);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  return { loading, error, sendTransaction };
};

export default useSendTONTransaction;