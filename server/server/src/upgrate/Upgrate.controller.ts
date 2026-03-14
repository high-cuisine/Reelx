import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { UpgrateService } from './Upgrate.service';
import { GetChanceDto } from './dto/get-chance.dto';
import { SetWishNftDto } from './dto/set-wish-nft.dto';
import { JwtAuthGuard } from '../../libs/common/guard/jwt-auth.guard.guard';
import { CurrentUser } from '../../libs/common/decorators/current-user.decorator';

@Controller('upgrate')
export class UpgrateController {
  constructor(private readonly upgrateService: UpgrateService) {}

  @Post('get-chance')
  @UseGuards(JwtAuthGuard)
  async getChance(
    @CurrentUser() userId: string,
    @Body() body: GetChanceDto,
  ) {
    return this.upgrateService.getChance(
      userId,
      body.toyIds,
      body.multiplier,
    );
  }

  @Post('set-wish-nft')
  @UseGuards(JwtAuthGuard)
  async setWishNft(
    @CurrentUser() userId: string,
    @Body() body: SetWishNftDto,
  ) {
    return this.upgrateService.setWishNft(userId, body.id);
  }

  @Get('start-game')
  @UseGuards(JwtAuthGuard)
  async startGame(@CurrentUser() userId: string) {
    return this.upgrateService.startGame(userId);
  }
}
