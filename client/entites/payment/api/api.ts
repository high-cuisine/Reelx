import * as api from '@/shared/lib/api/api';
import { CreatePaymentDto } from '../dto/create-payment.dto';

export interface BalanceResponse {
    tonBalance: number;
    starsBalance: number;
}

export interface TransactionResponse {
    id: string;
    userId: string;
    amount: number;
    type: 'stars' | 'ton';
    createdAt: string;
    updatedAt: string;
}

class PaymentService {
    async handlePayment(amount: number, type: 'stars'): Promise<CreatePaymentDto> {
        const response = await api.$authHost.post(`/users/payment`, { amount, type });
        return response.data;
    }

    async depositTon(amount: number): Promise<{ success: boolean; message: string }> {
        const response = await api.$authHost.post(`/users/deposit-ton`, { amount });
        return response.data;
    }

    async getBalance(): Promise<BalanceResponse> {
        const response = await api.$authHost.get(`/users/balance`);
        return response.data;
    }

    async getLatestTransaction(): Promise<TransactionResponse | null> {
        const response = await api.$authHost.get(`/users/latest-transaction`);
        return response.data;
    }
}

export const paymentService = new PaymentService();