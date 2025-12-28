import { Controller, Get, Put, Delete, Param, Body, UseGuards, Res, NotFoundException, BadRequestException, Post } from '@nestjs/common';
import { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { ChangeUsernameDto } from '../dto/change-username.dto';
import { UsersService } from '../services/users.service';
import { JwtAuthGuard } from '../../../libs/common/guard/jwt-auth.guard.guard';
import { CurrentUser } from '../../../libs/common/decorators/current-user.decorator';
import { PaymentDto } from '../dto/payment.dto';
import { TelegramBotService } from '../../telegram-bot/services/telegram-bot.service';

@Controller('users')
export class UserController {
    private readonly staticsPath = path.join(process.cwd(), 'libs', 'statics');
    private readonly allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

    constructor(
        private readonly userService: UsersService,
        private readonly telegramBotService: TelegramBotService,
    ) {}

    @Get('/photo/:filename')
    async getPhoto(@Param('filename') filename: string, @Res() res: Response) {
    
        if (!/^[a-zA-Z0-9._-]+$/.test(filename)) {
            throw new BadRequestException('Invalid filename');
        }

     
        const ext = path.extname(filename).toLowerCase();
        if (!this.allowedExtensions.includes(ext)) {
            throw new BadRequestException('Invalid file extension');
        }

   
        const filePath = path.join(this.staticsPath, filename);

       
        const normalizedPath = path.normalize(filePath);
        const normalizedStaticsPath = path.normalize(this.staticsPath);
        if (!normalizedPath.startsWith(normalizedStaticsPath)) {
            throw new BadRequestException('Invalid file path');
        }

       
        if (!fs.existsSync(filePath)) {
            throw new NotFoundException('File not found');
        }

      
        const stats = fs.statSync(filePath);
        if (!stats.isFile()) {
            throw new BadRequestException('Path is not a file');
        }

      
        const mimeTypes: Record<string, string> = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.webp': 'image/webp',
        };

        const mimeType = mimeTypes[ext] || 'application/octet-stream';

      
        res.setHeader('Content-Type', mimeType);
        res.setHeader('Content-Length', stats.size);
        res.setHeader('Cache-Control', 'public, max-age=31536000'); // Кеширование на 1 год

        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);
    }

    @Put('/change-username')
    @UseGuards(JwtAuthGuard)
    async changeUsername(
      @CurrentUser() userId: string,
      @Body() changeUsernameDto: ChangeUsernameDto,
    ) {
      return this.userService.changeUsername(userId, changeUsernameDto);
    }

    @Post('/payment')
    @UseGuards(JwtAuthGuard)
    async payment(
        @CurrentUser() userId: string,
        @Body() paymentDto: PaymentDto,
    ) {
        if (paymentDto.type !== 'stars') {
            throw new BadRequestException('Only stars payment type is supported');
        }

        if (!paymentDto.amount || paymentDto.amount <= 0) {
            throw new BadRequestException('Amount must be greater than 0');
        }

        const payload = `payment_${userId}_${Date.now()}`;
        const invoiceLink = await this.telegramBotService.createInvoiceLink(
            paymentDto.amount,
            payload,
        );

        return {
            invoiceLink,
            amount: paymentDto.amount,
            type: paymentDto.type,
        };
    }

    @Get('/balance')
    @UseGuards(JwtAuthGuard)
    async getBalance(
        @CurrentUser() userId: string,
    ) {
        return this.userService.getBalance(userId);
    }

    @Get('/transactions')
    @UseGuards(JwtAuthGuard)
    async getTransactions(
        @CurrentUser() userId: string,
    ) {
        return this.userService.getTransactionsByUserId(userId);
    }

    @Get('/latest-transaction')
    @UseGuards(JwtAuthGuard)
    async getLatestTransaction(
        @CurrentUser() userId: string,
    ) {
        const transaction = await this.userService.getLatestTransaction(userId);
        return transaction;
    }

}

