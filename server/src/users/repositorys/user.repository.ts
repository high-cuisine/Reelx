import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../libs/infrustructure/prisma/prisma.service';
import { UserLoginInterface } from '../interface/user-login.interface';
import { User, Transaction, TransactionType } from '@prisma/client';

@Injectable()
export class UserRepository {
    constructor(private readonly prisma: PrismaService) {}

    async findUserByTelegramId(telegramId: string): Promise<User | null> {
        return (await this.prisma.user.findUnique({
            where: {
                telegramId,
            },
        }));
    }

    async createUser(user: UserLoginInterface): Promise<User> {
        return (await this.prisma.user.create({
            data: { 
                telegramId: user.telegramId, 
                username: user.username, 
                photoUrl: user.photoUrl,
            },
        }));
    }

    async changeUsername(userId: string, username: string): Promise<User> {
        return (await this.prisma.user.update({
            where: { id: userId },
            data: { username: username },
        }));
    }

    async updateStarsBalance(userId: string, amount: number): Promise<User> {
        return (await this.prisma.user.update({
            where: { id: userId },
            data: {
                starsBalance: { increment: amount },
            },
        }));
    }

    async findUserById(userId: string): Promise<User | null> {
        return (await this.prisma.user.findUnique({
            where: { id: userId },
        }));
    }

    async createTransaction(
        userId: string, 
        amount: number, 
        type: TransactionType
    ): Promise<Transaction> {
        return (await this.prisma.transaction.create({
            data: {
                userId,
                amount,
                type,
            },
        }));
    }

    async getTransactionsByUserId(userId: string): Promise<Transaction[]> {
        return (await this.prisma.transaction.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        }));
    }

    async getLatestTransaction(userId: string, type?: TransactionType): Promise<Transaction | null> {
        return (await this.prisma.transaction.findFirst({
            where: type ? { userId, type } : { userId },
            orderBy: { createdAt: 'desc' },
        }));
    }
}