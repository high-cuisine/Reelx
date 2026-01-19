import { Controller, Post, Body, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { NftPurchaseService } from '../services/nft-purchase.service';
import { BuyNftDto, BuyNftResponse } from '../dto/buy-nft.dto';
import { TransferNftDto, TransferNftResponse } from '../dto/transfer-nft.dto';
import { SendTonDto, SendTonResponse } from '../dto/send-ton.dto';
import { Address } from 'ton-core';

@Controller('nft/purchase')
export class NftPurchaseController {
  private readonly logger = new Logger(NftPurchaseController.name);

  constructor(private readonly nftPurchaseService: NftPurchaseService) {}

  @Post()
  async buyNft(@Body() buyDto: BuyNftDto): Promise<BuyNftResponse> {
    try {
      // Валидация адреса sale контракта
      try {
        Address.parse(buyDto.sale_address);
      } catch (error) {
        throw new HttpException(
          `Invalid sale contract address format: ${buyDto.sale_address}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      // Валидация цены, если указана
      if (buyDto.price) {
        try {
          const priceBigInt = BigInt(buyDto.price);
          if (priceBigInt <= 0n) {
            throw new HttpException(
              'Price must be greater than 0',
              HttpStatus.BAD_REQUEST,
            );
          }
        } catch (error) {
          if (error instanceof HttpException) {
            throw error;
          }
          throw new HttpException(
            `Invalid price format: ${buyDto.price}`,
            HttpStatus.BAD_REQUEST,
          );
        }
      }

      const result = await this.nftPurchaseService.buyNft(
        buyDto.sale_address,
        buyDto.price,
      );

      if (!result.success) {
        throw new HttpException(
          result.error || 'Failed to buy NFT',
          HttpStatus.BAD_REQUEST,
        );
      }

      return result;
    } catch (error) {
      this.logger.error(`Error buying NFT: ${error.message}`);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        'Failed to buy NFT',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('transfer')
  async transferNft(@Body() transferDto: TransferNftDto): Promise<TransferNftResponse> {
    try {
      // Валидация адреса NFT контракта
      try {
        Address.parse(transferDto.nft_address);
      } catch (error) {
        throw new HttpException(
          `Invalid NFT contract address format: ${transferDto.nft_address}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      // Валидация адреса нового владельца
      try {
        Address.parse(transferDto.new_owner_address);
      } catch (error) {
        throw new HttpException(
          `Invalid new owner address format: ${transferDto.new_owner_address}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      // Валидация query_id, если указан
      if (transferDto.query_id) {
        try {
          const queryIdBigInt = BigInt(transferDto.query_id);
          if (queryIdBigInt < 0n) {
            throw new HttpException(
              'Query ID must be non-negative',
              HttpStatus.BAD_REQUEST,
            );
          }
        } catch (error) {
          if (error instanceof HttpException) {
            throw error;
          }
          throw new HttpException(
            `Invalid query_id format: ${transferDto.query_id}`,
            HttpStatus.BAD_REQUEST,
          );
        }
      }

      // Валидация forward_amount, если указана
      if (transferDto.forward_amount) {
        try {
          const forwardAmountBigInt = BigInt(transferDto.forward_amount);
          if (forwardAmountBigInt < 0n) {
            throw new HttpException(
              'Forward amount must be non-negative',
              HttpStatus.BAD_REQUEST,
            );
          }
        } catch (error) {
          if (error instanceof HttpException) {
            throw error;
          }
          throw new HttpException(
            `Invalid forward_amount format: ${transferDto.forward_amount}`,
            HttpStatus.BAD_REQUEST,
          );
        }
      }

      const result = await this.nftPurchaseService.transferNft(
        transferDto.nft_address,
        transferDto.new_owner_address,
        transferDto.query_id,
        transferDto.forward_amount,
      );

      if (!result.success) {
        throw new HttpException(
          result.error || 'Failed to transfer NFT',
          HttpStatus.BAD_REQUEST,
        );
      }

      return result;
    } catch (error) {
      this.logger.error(`Error transferring NFT: ${error.message}`);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        'Failed to transfer NFT',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('send-ton')
  async sendTon(@Body() sendTonDto: SendTonDto): Promise<SendTonResponse> {
    try {
      // Валидация адреса получателя
      try {
        Address.parse(sendTonDto.to_address);
      } catch (error) {
        throw new HttpException(
          `Invalid recipient address format: ${sendTonDto.to_address}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      // Валидация суммы
      try {
        const amountBigInt = BigInt(sendTonDto.amount);
        if (amountBigInt <= 0n) {
          throw new HttpException(
            'Amount must be greater than 0',
            HttpStatus.BAD_REQUEST,
          );
        }
      } catch (error) {
        if (error instanceof HttpException) {
          throw error;
        }
        throw new HttpException(
          `Invalid amount format: ${sendTonDto.amount}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      const result = await this.nftPurchaseService.sendTon(
        sendTonDto.to_address,
        sendTonDto.amount,
      );

      if (!result.success) {
        throw new HttpException(
          result.error || 'Failed to send TON',
          HttpStatus.BAD_REQUEST,
        );
      }

      return result;
    } catch (error) {
      this.logger.error(`Error sending TON: ${error.message}`);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        'Failed to send TON',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

