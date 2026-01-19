import { IsString, IsNotEmpty } from 'class-validator';

export class SendTonDto {
  @IsString()
  @IsNotEmpty()
  to_address: string;

  @IsString()
  @IsNotEmpty()
  amount: string; // Сумма в nanotons
}

export interface SendTonResponse {
  success: boolean;
  transaction_hash?: string;
  message?: string;
  error?: string;
}
