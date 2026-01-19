import { paymentService as paymentServiceApi, BalanceResponse, TransactionResponse } from '@/entites/payment/api/api';

class PaymentService {
    async handlePayment(amount: number, type: 'stars') {
        try {
            const response = await paymentServiceApi.handlePayment(amount, type);
            return response;
        } catch (error) {
            console.error('Error handling payment:', error);
            throw error;
        }
    }

    async getBalance(): Promise<BalanceResponse> {
        try {
            const response = await paymentServiceApi.getBalance();
            return response;
        } catch (error) {
            console.error('Error getting balance:', error);
            throw error;
        }
    }

    async getLatestTransaction(): Promise<TransactionResponse | null> {
        try {
            const response = await paymentServiceApi.getLatestTransaction();
            return response;
        } catch (error) {
            console.error('Error getting latest transaction:', error);
            throw error;
        }
    }

    async depositTon(amount: number): Promise<{ success: boolean; message: string }> {
        try {
            const response = await paymentServiceApi.depositTon(amount);
            return response;
        } catch (error) {
            console.error('Error depositing TON:', error);
            throw error;
        }
    }
}

export const paymentService = new PaymentService();