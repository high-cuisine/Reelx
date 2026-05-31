import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { IsIn, IsArray, IsString } from 'class-validator';
import { GiftsService } from './gifts.service';
import { GetGiftsByPriceDto } from './dto/get-gifts-by-price.dto';
import { WithdrawNftDto } from './dto/withdraw-nft.dto';
import { JwtAuthGuard } from '../../libs/common/guard/jwt-auth.guard.guard';
import { CurrentUser } from '../../libs/common/decorators/current-user.decorator';
import { WithdrawGiftsService } from './withdraw-gifts.service';
import { BuyNFTDto } from './dto/buy-nft.dto';

class WithdrawGiftsDto {
  @IsArray()
  @IsString({ each: true })
  giftIds: string[];
}

class ClaimTelegramGiftDto {
  @IsIn(['gift', 'currency'])
  action: 'gift' | 'currency';
}

@Controller('gifts')
export class GiftsController {
  constructor(
    private readonly giftsService: GiftsService,
    private readonly withdrawGiftsService: WithdrawGiftsService,
  ) {}

  @Get('min-price')
  async getMinPrice() {
    return this.giftsService.getMinPrice();
  }

  @Post('by-price')
  @UseGuards(JwtAuthGuard)
  async getGiftsByPrice(
    @Body() body?: GetGiftsByPriceDto,
    @CurrentUser() userId?: string,
  ) {
    return this.giftsService.getGiftsByPrice(body, userId);
  }

  @Post('start-game')
  @UseGuards(JwtAuthGuard)
  async startGame(@CurrentUser() userId: string) {
    return this.giftsService.startGame(userId);
  }

  @Post('claim-telegram-gift')
  @UseGuards(JwtAuthGuard)
  async claimTelegramGift(
    @CurrentUser() userId: string,
    @Body() body: ClaimTelegramGiftDto,
  ) {
    return this.giftsService.claimTelegramGift(userId, body.action);
  }

  @Post('withdraw')
  @UseGuards(JwtAuthGuard)
  async withdrawGifts(
    @CurrentUser() userId: string,
    @Body() body: WithdrawGiftsDto,
  ) {
    return this.withdrawGiftsService.withdrawUserGifts(userId, body.giftIds);
  }

  @Post('withdraw-nft')
  @UseGuards(JwtAuthGuard)
  async withdrawNftToWallet(
    @CurrentUser() userId: string,
    @Body() body: WithdrawNftDto,
  ) {
    return this.withdrawGiftsService.withdrawNftToWallet(
      userId,
      body.giftId,
      body.walletAddress,
    );
  }

  @Post('/buy-nft')
  @UseGuards(JwtAuthGuard)
  async buyNFT(
    @CurrentUser() userId: string,
    @Body() body: BuyNFTDto,
  ) {
    return this.giftsService.buyNFT(userId, body.nftId);
  }
}
