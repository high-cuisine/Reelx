import * as api from '@/shared/lib/api/api';
import { CreatePaymentDto } from '../dto/create-payment.dto';

class PaymentService {
    async handlePayment(amount: number, type: 'stars'): Promise<CreatePaymentDto> {
        const response = await api.$authHost.post(`/users/payment`, { amount, type });
        return response.data;
    }
}

export const paymentService = new PaymentService();