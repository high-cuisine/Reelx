import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class TransferNftDto {
  @IsString()
  @IsNotEmpty()
  nft_address: string;

  @IsString()
  @IsNotEmpty()
  new_owner_address: string;

  @IsString()
  @IsOptional()
  query_id?: string; // Опциональный query_id для идентификации запроса

  @IsString()
  @IsOptional()
  forward_amount?: string; // Опциональная сумма для форварда сообщений (в nanotons)
}

export interface TransferNftResponse {
  success: boolean;
  transaction_hash?: string;
  message?: string;
  error?: string;
}
