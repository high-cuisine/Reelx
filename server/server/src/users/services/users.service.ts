import { Injectable } from '@nestjs/common';
import { UserRepository } from '../repositorys/user.repository';
import { ChangeUsernameDto } from '../dto/change-username.dto';
import { TransactionType } from '@prisma/client';
import { UserGiftRto } from '../rto/user-gift.rto';

@Injectable()
export class UsersService {
  
    constructor(private readonly userRepository: UserRepository) {}


    async createUser(telegramId:string, username:string, photo_url:string) {
        await this.userRepository.createUser({telegramId, username, photoUrl: photo_url})
    }

    async changeUsername(userId: string, changeUsernameDto: ChangeUsernameDto): Promise<void> {
        await this.userRepository.changeUsername(userId, changeUsernameDto.username);
    }

    async findUserByTelegramId(telegramId:string) {
        return (await this.userRepository.findUserByTelegramId(telegramId))
    }

    async updateStarsBalance(userId: string, amount: number): Promise<void> {
        // Обновляем баланс и создаем транзакцию в одной транзакции БД
        await this.userRepository.updateStarsBalance(userId, amount);
        await this.userRepository.createTransaction(userId, amount, TransactionType.stars);
    }

    async updateTonBalance(userId: string, amount: number): Promise<void> {
        // Обновляем баланс и создаем транзакцию
        await this.userRepository.updateTonBalance(userId, amount);
        await this.userRepository.createTransaction(userId, amount, TransactionType.ton);
    }

    async createUserGift(data: {
        userId: string;
        giftName: string;
        giftAddress: string;
        collectionAddress?: string;
        image?: string;
        price?: number;
    }) {
        return await this.userRepository.createUserGift(data);
    }

    async findUserById(userId: string) {
        return (await this.userRepository.findUserById(userId));
    }

    async getBalance(userId: string) {
        const user = await this.userRepository.findUserById(userId);
        if (!user) {
            return { tonBalance: 0, starsBalance: 0 };
        }
        return {
            tonBalance: user.tonBalance || 0,
            starsBalance: user.starsBalance || 0,
        };
    }

    async getLatestTransaction(userId: string, type?: TransactionType) {
        return (await this.userRepository.getLatestTransaction(userId, type));
    }

    async getTransactionsByUserId(userId: string) {
        return (await this.userRepository.getTransactionsByUserId(userId));
    }

    async depositTon(userId: string, amount: number): Promise<void> {
        // Инкрементируем баланс TON и создаем транзакцию
        await this.userRepository.updateTonBalance(userId, amount);
        await this.userRepository.createTransaction(userId, amount, TransactionType.ton);
    }

    async getUserGifts(userId: string): Promise<UserGiftRto[]> {
        const gifts = await this.userRepository.getUserGifts(userId);
        return gifts.map(gift => ({
            id: gift.id,
            giftName: gift.giftName,
            image: gift.image ?? undefined,
            price: gift.price ?? undefined,
            isOut: gift.isOut,
            createdAt: gift.createdAt,
        }));
    }
}

