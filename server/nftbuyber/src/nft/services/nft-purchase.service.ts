import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TonClient, WalletContractV4, Address } from '@ton/ton';
import { internal, beginCell, toNano, Cell } from '@ton/core';
import { mnemonicToWalletKey } from 'ton-crypto';
import { getHttpEndpoint } from '@orbs-network/ton-access';
import axios from 'axios';
import { BuyNftResponse } from '../dto/buy-nft.dto';
import { TransferNftResponse } from '../dto/transfer-nft.dto';
import { hexContractType } from '@/src/infrastructure/getgems/constants/hexContractType.contant';

@Injectable()
export class NftPurchaseService implements OnModuleInit {
  private readonly logger = new Logger(NftPurchaseService.name);
  private client: TonClient | null = null;
  private mnemonic: string[] = [];
  private readonly maxRetries = 3;
  private readonly retryDelay = 2000; // 2 секунды
  private isInitialized = false;

  constructor(private readonly configService: ConfigService) {}

  private readonly defaultEndpoint = 'https://toncenter.com/api/v2/jsonRPC';

  async onModuleInit() {
    try {
      let endpoint: string;
      try {
        endpoint = await getHttpEndpoint({ network: 'mainnet' });
      } catch (accessError: any) {
        endpoint =
          this.configService.get<string>('TON_HTTP_ENDPOINT') ?? this.defaultEndpoint;
        this.logger.warn(
          `ton-access failed (${accessError?.message ?? 'unknown'}), using endpoint: ${endpoint}`,
        );
      }
      this.logger.log(`Using TON endpoint: ${endpoint}`);

      const tonApiKey = this.configService.get<string>('TON_API_KEY');
      if (!tonApiKey) {
        this.logger.warn('TON_API_KEY not found in environment variables');
      }

      this.client = new TonClient({
        endpoint,
        apiKey: tonApiKey,
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

      this.isInitialized = true;
      this.logger.log('NftPurchaseService initialized successfully');
    } catch (error) {
      this.logger.error(`Failed to initialize NftPurchaseService: ${error.message}`);
      this.logger.error('Please install dependencies: npm install --legacy-peer-deps');
      this.client = null;
      this.mnemonic = [];
      this.isInitialized = false;
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
      if (!this.client) {
        this.logger.warn('TON client not initialized');
        return false;
      }

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
      if (!this.client) {
        this.logger.warn('TON client not initialized');
        return false;
      }

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
      if (!this.client) {
        this.logger.warn('TON client not initialized');
        return false;
      }

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
   * Получает владельца NFT через прямой HTTP запрос к API v3
   */
  private async getNftOwnerViaApi(nftAddress: string): Promise<Address | null> {
    try {
      const tonApiUrl = this.configService.get<string>('TON_API_URL') || 'https://toncenter.com/api/v3';
      const tonApiKey = this.configService.get<string>('TON_API_KEY');
      
      const queryString = new URLSearchParams({
        address: nftAddress,
        include_on_sale: 'false',
        limit: '1',
        offset: '0',
      }).toString();
      
      const fullUrl = `${tonApiUrl}/nft/items?${queryString}`;
      
      const headers: Record<string, string> = {
        'Accept': 'application/json',
      };
      
      if (tonApiKey) {
        headers['X-API-Key'] = tonApiKey;
      }
      
      const response = await axios.get(fullUrl, {
        headers,
        timeout: 10000,
      });
      
      if (response.data?.nft_items && response.data.nft_items.length > 0) {
        const nftItem = response.data.nft_items[0];
        if (nftItem.owner_address) {
          const ownerRaw = nftItem.owner_address;
          const ownerEntry = response.data.address_book?.[ownerRaw];
          
          if (ownerEntry?.user_friendly) {
            return Address.parse(ownerEntry.user_friendly);
          } else if (ownerRaw) {
            try {
              return Address.parse(ownerRaw);
            } catch (parseError) {
              this.logger.debug(`Failed to parse owner address ${ownerRaw}: ${parseError.message}`);
            }
          }
        }
      }
      
      return null;
    } catch (error: any) {
      this.logger.warn(`Failed to get NFT owner via API: ${error.message}`);
      return null;
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
      if (!this.client) {
        this.logger.warn('TON client not initialized');
        return null;
      }

      const saleAddr = Address.parse(saleAddress);
      
      const saleData = await this.retryOnRateLimit(
        () => this.client!.runMethod(saleAddr, 'get_sale_data'),
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
  ): Promise<TransferNftResponse> {
    try {
      // Guard: проверяем готовность клиента
      if (!this.isInitialized || !this.client) {
        return { 
          success: false, 
          error: 'TON client not initialized. Service is still initializing or initialization failed.' 
        };
      }
  
      if (!this.mnemonic || this.mnemonic.length !== 24) {
        return { success: false, error: 'Wallet mnemonic not configured' };
      }
  
      const nftAddr = Address.parse(nftAddress);
      const newOwnerAddr = Address.parse(newOwnerAddress);
  
      this.logger.log(`NFT12: ${nftAddress}`);
      // --- wallet ---
      const keyPair = await mnemonicToWalletKey(this.mnemonic);
      const wallet = WalletContractV4.create({
        workchain: 0,
        publicKey: keyPair.publicKey,
      });
  
      const walletContract = this.client.open(wallet);
     
      // --- payload ---
      const queryIdValue =
        queryId ? BigInt(queryId) : (BigInt(Date.now()) << 16n);
  
      const gasAmount = toNano('0.03');
  
      // NFT transfer payload format (standard TON NFT):
      // op (32 bits) = 0x5fcc3d14
      // query_id (64 bits)
      // new_owner (Address)
      // response_destination (Address)
      // custom_payload (1 bit: 0 = no payload, stored as bit)
      // forward_amount (Coins)
      // forward_payload (1 bit: 0 = no payload, stored as bit, NOT as ref)
      const transferPayload = beginCell()
        .storeUint(0x5fcc3d14, 32) // transfer opcode
        .storeUint(queryIdValue, 64) // query_id
        .storeAddress(newOwnerAddr) // new_owner
        .storeAddress(wallet.address) // response_destination
        .storeBit(0) // no custom_payload (stored as bit)
        .storeCoins(toNano("0.01")) // forward_amount
        .storeBit(0) // no forward_payload (stored as bit, not ref)
        .endCell();
  
      this.logger.log('Sending NFT transfer');
      this.logger.log(`NFT: ${nftAddress}`);
      this.logger.log(`To: ${newOwnerAddress}`);
      this.logger.log(`Query ID: ${queryIdValue}`);
      this.logger.log(`Gas Amount: ${gasAmount}`);
      this.logger.log(`Transfer Payload: ${transferPayload.toBoc().toString('hex')}`);
      this.logger.log(`Wallet Address: ${wallet.address.toString({ bounceable: false })}`);

      // Получаем истинного владельца NFT через API v3 для отладки
      const nftOwner = await this.getNftOwnerViaApi(nftAddress);
      if (nftOwner) {
        this.logger.log(`🔍 NFT on-chain owner (TRUE): ${nftOwner.toString({ bounceable: false })}`);
        this.logger.log(`🔍 Wallet address: ${wallet.address.toString({ bounceable: false })}`);
        this.logger.log(`🔍 New owner address: ${newOwnerAddress}`);
        
        // Проверяем, совпадает ли текущий владелец с кошельком
        const ownerStr = nftOwner.toString({ bounceable: false, urlSafe: true });
        const walletStr = wallet.address.toString({ bounceable: false, urlSafe: true });
        if (ownerStr === walletStr) {
          this.logger.log(`✅ NFT owner matches wallet - transfer should work`);
        } else {
          this.logger.warn(`⚠️ NFT owner DOES NOT match wallet! Owner: ${ownerStr}, Wallet: ${walletStr}`);
        }
      } else {
        this.logger.warn(`⚠️ Could not get NFT owner via API`);
      }
  
      const seqno = await walletContract.getSeqno();
  
      await walletContract.sendTransfer({
        seqno,
        secretKey: keyPair.secretKey,
        messages: [
          internal({
            to: nftAddr,
            value: gasAmount,
            bounce: false, // 🔥 КРИТИЧЕСКИ ВАЖНО
            body: transferPayload,
          }),
        ],
      });
  
      return {
        success: true,
        message: 'NFT transfer transaction sent',
      };
    } catch (error: any) {
      this.logger.error(`NFT transfer failed: ${error.message}`);
  
      return {
        success: false,
        error: error.message || 'Unknown error',
      };
    }
  }
  
  /** Для синка: можно ли проверять тип контракта (нужен инициализированный TON client). */
  isClientInitialized(): boolean {
    return this.isInitialized && this.client !== null;
  }

  /** Retryable TON API errors (502/503, timeouts, connection resets). */
  private isRetryableTonError(e: any): boolean {
    const status = e?.response?.status ?? e?.status;
    const code = e?.code ?? e?.response?.data?.error;
    if (status === 502 || status === 503) return true;
    if (code === 'ECONNRESET' || code === 'ETIMEDOUT' || code === 'ECONNREFUSED') return true;
    return false;
  }

  async checkNftContractType(address: Address) {
    if (!this.client) {
      this.logger.warn('checkNftContractType: TON client not initialized');
      return null;
    }
    let lastError: any;
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const contractState = await this.client.getContractState(address);
        if (!contractState?.code) {
          this.logger.debug(`checkNftContractType: no code for address ${address.toString()}`);
          return null;
        }
        const codeCell = Cell.fromBoc(Buffer.from(contractState.code))[0];
        const codeHash = codeCell.hash().toString("hex");
        const contractType = hexContractType[codeHash.toString()];
        return contractType && contractType.toString().includes('nft_sale_getgems');
      } catch (e) {
        lastError = e;
        const status = e?.response?.status ?? e?.status;
        const msg = e?.message ?? String(e);
        if (this.isRetryableTonError(e) && attempt < this.maxRetries) {
          this.logger.warn(
            `checkNftContractType TON API error (${status ?? msg}), retry ${attempt}/${this.maxRetries} in ${this.retryDelay}ms`,
          );
          await new Promise((r) => setTimeout(r, this.retryDelay));
          continue;
        }
        this.logger.warn(
          `checkNftContractType failed for ${address.toString()}: ${status ? `HTTP ${status}` : msg}`,
        );
        return null;
      }
    }
    this.logger.warn(
      `checkNftContractType failed after ${this.maxRetries} attempts: ${lastError?.message ?? String(lastError)}`,
    );
    return null;
  }
}

