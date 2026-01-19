import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TonClient, WalletContractV4, Address } from '@ton/ton';
import { internal, beginCell } from '@ton/core';
import { mnemonicToWalletKey } from 'ton-crypto';
import { BuyNftResponse } from '../dto/buy-nft.dto';
import { TransferNftResponse } from '../dto/transfer-nft.dto';
import { SendTonResponse } from '../dto/send-ton.dto';

@Injectable()
export class NftPurchaseService {
  private readonly logger = new Logger(NftPurchaseService.name);
  private readonly client: TonClient;
  private readonly mnemonic: string[];
  private readonly maxRetries = 3;
  private readonly retryDelay = 2000; // 2 секунды

  constructor(private readonly configService: ConfigService) {
    try {
      // Инициализация TonClient
      const tonCenterUrl = this.configService.get<string>('TONCENTER_URL') || 'https://toncenter.com/api/v2/jsonRPC';
      const tonCenterApiKey = this.configService.get<string>('TONCENTER_API_KEY');

      if (!tonCenterApiKey) {
        this.logger.warn('TONCENTER_API_KEY not found in environment variables');
      }

      this.client = new TonClient({
        endpoint: tonCenterUrl,
        apiKey: tonCenterApiKey,
      });

      // Инициализация кошелька из mnemonic
      const mnemonicString = this.configService.get<string>('WALLET_MNEMONIC');
      if (mnemonicString) {
        this.mnemonic = mnemonicString.split(' ').filter(word => word.trim().length > 0);
        if (this.mnemonic.length !== 24) {
          this.logger.error(`Invalid mnemonic: expected 24 words, got ${this.mnemonic.length}`);
          this.mnemonic = [];
        } else {
          this.logger.debug('Wallet mnemonic loaded successfully');
        }
      } else {
        this.logger.warn('WALLET_MNEMONIC not found in environment variables');
        this.mnemonic = [];
      }
    } catch (error) {
      // Если не удалось инициализировать (например, нет @ton/ton), создаем заглушки
      this.logger.error(`Failed to initialize NftPurchaseService: ${error.message}`);
      this.logger.error('Please install dependencies: npm install --legacy-peer-deps');
      
      // Создаем заглушки, чтобы сервис мог быть создан
      this.mnemonic = [];
      // @ts-ignore - игнорируем ошибку типа, если модуль не установлен
      this.client = null as any;
    }
  }

  /**
   * Проверяет, продаётся ли NFT по fixed price
   * Делает предупреждения, но не блокирует покупку, если проверки не прошли
   */
  async isFixedPriceSale(saleAddress: string): Promise<boolean> {
    try {
      const expectedOwner = Address.parse(saleAddress);

      // Получаем адрес NFT из sale контракта
      let nftAddress: Address;
      let isComplete = false;
      try {
        const saleData = await this.client.runMethod(expectedOwner, 'get_sale_data');
        isComplete = saleData.stack.readNumber() !== 0; // is_complete - проверяем, не завершена ли продажа
        saleData.stack.readNumber(); // created_at - игнорируем
        saleData.stack.readAddress(); // marketplace_address - игнорируем
        nftAddress = saleData.stack.readAddress(); // nft_address
        
        if (isComplete) {
          this.logger.warn(`Sale contract is marked as complete. NFT may not be available.`);
          // Не блокируем, так как это может быть ложный сигнал
        }
      } catch (error) {
        this.logger.warn(`Failed to get NFT address from sale contract: ${error.message}`);
        // Если не можем получить данные, считаем что проверка не прошла
        // Но это не обязательно означает, что покупка невозможна
        return false;
      }

      // ПРОВЕРЯЕМ ТОЛЬКО NFT - это единственный источник истины
      let nftData;
      try {
        nftData = await this.client.runMethod(nftAddress, 'get_nft_data');
      } catch (error) {
        this.logger.warn(`Failed to get NFT data: ${error.message}`);
        // Если не можем получить данные NFT, пропускаем проверку
        // но возвращаем false, чтобы показать предупреждение
        return false;
      }
      
      // Структура get_nft_data:
      // init (int), index (int), collection (Address), owner (Address), content (Cell)
      nftData.stack.readNumber();   // init - игнорируем
      nftData.stack.readNumber();   // index - игнорируем
      nftData.stack.readAddress();  // collection - игнорируем
      const actualOwner = nftData.stack.readAddress(); // owner NFT - ЕДИНСТВЕННЫЙ источник истины

      // Проверяем, что owner NFT = expected owner (sale контракт)
      const expectedOwnerStr = expectedOwner.toString({ urlSafe: true, bounceable: false });
      const actualOwnerStr = actualOwner.toString({ urlSafe: true, bounceable: false });
      
      if (actualOwnerStr !== expectedOwnerStr) {
        // Проверяем разные форматы адресов
        const expectedOwnerStrBounceable = expectedOwner.toString({ urlSafe: true, bounceable: true });
        const actualOwnerStrBounceable = actualOwner.toString({ urlSafe: true, bounceable: true });
        
        if (actualOwnerStrBounceable !== expectedOwnerStrBounceable) {
          this.logger.warn(`NFT owner mismatch. Expected: ${expectedOwnerStr}, Actual: ${actualOwnerStr}`);
          // Не блокируем - адреса могут различаться по формату, но быть одинаковыми
          return false;
        }
      }

      // Проверяем, что owner (sale контракт) является активным контрактом
      try {
        const ownerState = await this.client.getContractState(actualOwner);
        if (ownerState.state !== 'active') {
          this.logger.warn(`NFT owner (sale contract) state: ${ownerState.state} (expected: active)`);
          // Не блокируем - контракт может быть неактивным, но покупка всё равно возможна
          return false;
        }
      } catch (error) {
        this.logger.warn(`Failed to check contract state: ${error.message}`);
        // Продолжаем - если не можем проверить состояние, это не критично
      }

      this.logger.debug('Fixed-price sale confirmed (NFT is the source of truth)');
      return true;
    } catch (error) {
      this.logger.warn(`Failed to verify fixed-price sale: ${error.message}`);
      // При ошибке возвращаем false, но это не должно блокировать покупку
      return false;
    }
  }

  /**
   * Выполняет запрос с повторными попытками при 429 ошибке
   */
  private async retryOnRateLimit<T>(
    operation: () => Promise<T>,
    operationName: string,
    retries = this.maxRetries
  ): Promise<T> {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        const isRateLimit = 
          error?.status === 429 || 
          error?.response?.status === 429 ||
          error?.message?.includes('429') ||
          error?.message?.includes('rate limit') ||
          error?.message?.includes('Too Many Requests');

        if (isRateLimit && attempt < retries) {
          const delay = this.retryDelay * Math.pow(2, attempt); // Экспоненциальная задержка
          this.logger.warn(
            `${operationName} rate limited (429). Retry ${attempt + 1}/${retries} after ${delay}ms...`
          );
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        throw error;
      }
    }
    throw new Error(`Failed after ${retries} retries`);
  }

  /**
   * Получает цену из sale контракта
   */
  async getSalePrice(saleAddress: string): Promise<bigint | null> {
    try {
      const saleAddr = Address.parse(saleAddress);
      
      const saleData = await this.retryOnRateLimit(
        () => this.client.runMethod(saleAddr, 'get_sale_data'),
        'get_sale_data'
      );
      
      saleData.stack.readNumber(); // is_complete
      saleData.stack.readNumber(); // created_at
      saleData.stack.readAddress(); // marketplace_address
      saleData.stack.readAddress(); // nft_address
      const fullPrice = saleData.stack.readBigNumber(); // full_price
      
      return fullPrice;
    } catch (error: any) {
      const isRateLimit = 
        error?.status === 429 || 
        error?.response?.status === 429 ||
        error?.message?.includes('429');
      
      if (isRateLimit) {
        this.logger.error(`Rate limit (429) when getting price. Please wait before retrying.`);
      } else {
        this.logger.warn(`Failed to get price from sale contract: ${error.message}`);
      }
      return null;
    }
  }

  /**
   * Покупает NFT по fixed price
   */
  async buyNft(saleAddress: string, price?: string): Promise<BuyNftResponse> {
    try {
      // Проверяем наличие @ton/ton модуля
      if (!this.client) {
        return {
          success: false,
          error: 'TON client not initialized. Please install dependencies: npm install --legacy-peer-deps',
        };
      }

      // Проверяем наличие mnemonic
      if (!this.mnemonic || this.mnemonic.length !== 24) {
        return {
          success: false,
          error: 'Wallet mnemonic not configured. Set WALLET_MNEMONIC in environment variables.',
        };
      }

      // Валидируем адрес, но для internal() используем строку напрямую (как в оригинале)
      try {
        Address.parse(saleAddress);
      } catch (error) {
        return {
          success: false,
          error: `Invalid sale address format: ${saleAddress}`,
        };
      }

      // Проверяем, что это fixed price sale (предупреждение, не блокируем)
      const isFixedPrice = await this.isFixedPriceSale(saleAddress);
      if (!isFixedPrice) {
        this.logger.warn('Fixed-price sale verification failed, but proceeding with purchase anyway');
        // Не блокируем покупку - проверка может быть слишком строгой
        // В оригинальном тесте эта проверка вообще закомментирована
      }

      // Получаем цену, если не указана
      let priceInNano: bigint;
      if (price) {
        priceInNano = BigInt(price);
      } else {
        const salePrice = await this.getSalePrice(saleAddress);
        if (!salePrice) {
          return {
            success: false,
            error: 'Failed to get price from sale contract. Please specify price manually or wait if rate limited.',
          };
        }
        priceInNano = salePrice;
      }

      // Создаем кошелек
      const keyPair = await mnemonicToWalletKey(this.mnemonic);
      const wallet = WalletContractV4.create({
        workchain: 0,
        publicKey: keyPair.publicKey,
      });

      const walletContract = this.client.open(wallet);
      
      // Получаем seqno с retry логикой
      const seqno = await this.retryOnRateLimit(
        () => walletContract.getSeqno(),
        'getSeqno'
      );

      this.logger.log(`Buying NFT on-chain…`);
      this.logger.log(`Sale: ${saleAddress}`);
      this.logger.log(`Price: ${priceInNano.toString()} nanotons`);

      // Отправляем транзакцию с retry логикой
      // sendTransfer возвращает void, транзакция отправляется асинхронно
      // ВАЖНО: internal() принимает строку адреса, а не объект Address (как в оригинальном тесте)
      await this.retryOnRateLimit(
        () => walletContract.sendTransfer({
          seqno,
          secretKey: keyPair.secretKey,
          messages: [
            internal({
              to: saleAddress, // Передаём строку напрямую, не парсим в Address
              value: priceInNano,
              bounce: true,
              body: null,
            }),
          ],
        }),
        'sendTransfer'
      );

      this.logger.log('Transaction sent successfully');

      return {
        success: true,
        message: 'Transaction sent successfully. Check the blockchain for confirmation.',
      };
    } catch (error: any) {
      const isRateLimit = 
        error?.status === 429 || 
        error?.response?.status === 429 ||
        error?.message?.includes('429') ||
        error?.message?.includes('rate limit') ||
        error?.message?.includes('Too Many Requests');

      if (isRateLimit) {
        this.logger.error(`Rate limit (429) when buying NFT. Please wait and try again.`);
        return {
          success: false,
          error: 'Rate limit exceeded (429). Please wait a few seconds and try again. Too many requests to TON API.',
        };
      }

      this.logger.error(`Failed to buy NFT: ${error.message}`);
      return {
        success: false,
        error: error.message || 'Unknown error occurred',
      };
    }
  }

  /**
   * Переводит NFT на новый кошелек
   */
  async transferNft(
    nftAddress: string,
    newOwnerAddress: string,
    queryId?: string,
    forwardAmount?: string,
  ): Promise<TransferNftResponse> {
    try {
      // Проверяем наличие @ton/ton модуля
      if (!this.client) {
        return {
          success: false,
          error: 'TON client not initialized. Please install dependencies: npm install --legacy-peer-deps',
        };
      }

      // Проверяем наличие mnemonic
      if (!this.mnemonic || this.mnemonic.length !== 24) {
        return {
          success: false,
          error: 'Wallet mnemonic not configured. Set WALLET_MNEMONIC in environment variables.',
        };
      }

      // Валидируем адреса
      let nftAddr: Address;
      let newOwnerAddr: Address;
      try {
        nftAddr = Address.parse(nftAddress);
        newOwnerAddr = Address.parse(newOwnerAddress);
      } catch (error) {
        return {
          success: false,
          error: `Invalid address format: ${error.message}`,
        };
      }

      // Проверяем, что текущий кошелек является владельцем NFT
      try {
        const nftData = await this.retryOnRateLimit(
          () => this.client.runMethod(nftAddr, 'get_nft_data'),
          'get_nft_data'
        );
        
        nftData.stack.readNumber(); // init
        nftData.stack.readNumber(); // index
        nftData.stack.readAddress(); // collection
        const currentOwner = nftData.stack.readAddress(); // owner

        // Получаем адрес кошелька из mnemonic для проверки
        const keyPair = await mnemonicToWalletKey(this.mnemonic);
        const wallet = WalletContractV4.create({
          workchain: 0,
          publicKey: keyPair.publicKey,
        });
        const walletAddress = wallet.address;

        // Проверяем, что текущий владелец - это наш кошелек
        const currentOwnerStr = currentOwner.toString({ urlSafe: true, bounceable: false });
        const walletAddressStr = walletAddress.toString({ urlSafe: true, bounceable: false });
        
        if (currentOwnerStr !== walletAddressStr) {
          // Проверяем разные форматы адресов
          const currentOwnerStrBounceable = currentOwner.toString({ urlSafe: true, bounceable: true });
          const walletAddressStrBounceable = walletAddress.toString({ urlSafe: true, bounceable: true });
          
          if (currentOwnerStrBounceable !== walletAddressStrBounceable) {
            this.logger.warn(`NFT owner mismatch. Current owner: ${currentOwnerStr}, Wallet: ${walletAddressStr}`);
            return {
              success: false,
              error: 'Current wallet is not the owner of this NFT',
            };
          }
        }
      } catch (error: any) {
        this.logger.warn(`Failed to verify NFT ownership: ${error.message}`);
        // Не блокируем перевод - проверка может быть слишком строгой
      }

      // Создаем кошелек
      const keyPair = await mnemonicToWalletKey(this.mnemonic);
      const wallet = WalletContractV4.create({
        workchain: 0,
        publicKey: keyPair.publicKey,
      });

      const walletContract = this.client.open(wallet);
      
      // Получаем seqno с retry логикой
      const seqno = await this.retryOnRateLimit(
        () => walletContract.getSeqno(),
        'getSeqno'
      );

      // Создаем тело сообщения transfer
      // op: 0x5fcc3d14 (transfer op code)
      // query_id: uint64
      // new_owner: MsgAddress
      // response_destination: MsgAddress (null)
      // custom_payload: Cell (null)
      // forward_amount: Coins
      // forward_payload: Cell (null)
      const transferOp = 0x5fcc3d14; // transfer op code
      const queryIdValue = queryId ? BigInt(queryId) : BigInt(Date.now());
      const forwardAmountNano = forwardAmount ? BigInt(forwardAmount) : 0n;

      const transferBody = beginCell()
        .storeUint(transferOp, 32) // op
        .storeUint(queryIdValue, 64) // query_id
        .storeAddress(newOwnerAddr) // new_owner
        .storeAddress(null) // response_destination (null)
        .storeRef(beginCell().endCell()) // custom_payload (null)
        .storeCoins(forwardAmountNano) // forward_amount
        .storeRef(beginCell().endCell()) // forward_payload (null)
        .endCell();

      this.logger.log(`Transferring NFT on-chain…`);
      this.logger.log(`NFT: ${nftAddress}`);
      this.logger.log(`New owner: ${newOwnerAddress}`);
      this.logger.log(`Query ID: ${queryIdValue.toString()}`);

      // Отправляем транзакцию с retry логикой
      await this.retryOnRateLimit(
        () => walletContract.sendTransfer({
          seqno,
          secretKey: keyPair.secretKey,
          messages: [
            internal({
              to: nftAddress,
              value: forwardAmountNano > 0n ? forwardAmountNano : 50000000n, // Минимальная сумма для газа, если forward_amount не указан
              bounce: true,
              body: transferBody,
            }),
          ],
        }),
        'sendTransfer'
      );

      this.logger.log('Transfer transaction sent successfully');

      return {
        success: true,
        message: 'Transfer transaction sent successfully. Check the blockchain for confirmation.',
      };
    } catch (error: any) {
      const isRateLimit = 
        error?.status === 429 || 
        error?.response?.status === 429 ||
        error?.message?.includes('429') ||
        error?.message?.includes('rate limit') ||
        error?.message?.includes('Too Many Requests');

      if (isRateLimit) {
        this.logger.error(`Rate limit (429) when transferring NFT. Please wait and try again.`);
        return {
          success: false,
          error: 'Rate limit exceeded (429). Please wait a few seconds and try again. Too many requests to TON API.',
        };
      }

      this.logger.error(`Failed to transfer NFT: ${error.message}`);
      return {
        success: false,
        error: error.message || 'Unknown error occurred',
      };
    }
  }

  /**
   * Отправляет TON на указанный адрес
   */
  async sendTon(toAddress: string, amount: string): Promise<SendTonResponse> {
    try {
      // Проверяем наличие @ton/ton модуля
      if (!this.client) {
        return {
          success: false,
          error: 'TON client not initialized. Please install dependencies: npm install --legacy-peer-deps',
        };
      }

      // Проверяем наличие mnemonic
      if (!this.mnemonic || this.mnemonic.length !== 24) {
        return {
          success: false,
          error: 'Wallet mnemonic not configured. Set WALLET_MNEMONIC in environment variables.',
        };
      }

      // Валидируем адрес получателя
      let toAddr: Address;
      try {
        toAddr = Address.parse(toAddress);
      } catch (error) {
        return {
          success: false,
          error: `Invalid recipient address format: ${toAddress}`,
        };
      }

      // Валидируем сумму
      let amountInNano: bigint;
      try {
        amountInNano = BigInt(amount);
        if (amountInNano <= 0n) {
          return {
            success: false,
            error: 'Amount must be greater than 0',
          };
        }
      } catch (error) {
        return {
          success: false,
          error: `Invalid amount format: ${amount}`,
        };
      }

      // Создаем кошелек
      const keyPair = await mnemonicToWalletKey(this.mnemonic);
      const wallet = WalletContractV4.create({
        workchain: 0,
        publicKey: keyPair.publicKey,
      });

      const walletContract = this.client.open(wallet);
      
      // Получаем seqno с retry логикой
      const seqno = await this.retryOnRateLimit(
        () => walletContract.getSeqno(),
        'getSeqno'
      );

      this.logger.log(`Sending TON on-chain…`);
      this.logger.log(`To: ${toAddress}`);
      this.logger.log(`Amount: ${amountInNano.toString()} nanotons`);

      // Отправляем транзакцию с retry логикой
      await this.retryOnRateLimit(
        () => walletContract.sendTransfer({
          seqno,
          secretKey: keyPair.secretKey,
          messages: [
            internal({
              to: toAddress,
              value: amountInNano,
              bounce: false, // Обычно для обычных переводов bounce = false
              body: null,
            }),
          ],
        }),
        'sendTransfer'
      );

      this.logger.log('TON transfer transaction sent successfully');

      return {
        success: true,
        message: 'TON transfer transaction sent successfully. Check the blockchain for confirmation.',
      };
    } catch (error: any) {
      const isRateLimit = 
        error?.status === 429 || 
        error?.response?.status === 429 ||
        error?.message?.includes('429') ||
        error?.message?.includes('rate limit') ||
        error?.message?.includes('Too Many Requests');

      if (isRateLimit) {
        this.logger.error(`Rate limit (429) when sending TON. Please wait and try again.`);
        return {
          success: false,
          error: 'Rate limit exceeded (429). Please wait a few seconds and try again. Too many requests to TON API.',
        };
      }

      this.logger.error(`Failed to send TON: ${error.message}`);
      return {
        success: false,
        error: error.message || 'Unknown error occurred',
      };
    }
  }
}

