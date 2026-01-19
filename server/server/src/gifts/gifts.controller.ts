import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { GiftsService } from './gifts.service';
import { GetGiftsByPriceDto } from './dto/get-gifts-by-price.dto';
import { JwtAuthGuard } from '../../libs/common/guard/jwt-auth.guard.guard';
import { CurrentUser } from '../../libs/common/decorators/current-user.decorator';

@Controller('gifts')
export class GiftsController {
  constructor(private readonly giftsService: GiftsService) {}

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
}
