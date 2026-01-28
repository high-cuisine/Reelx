import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { IsNotEmpty, IsString } from 'class-validator';
import { PromocodeService } from '../service/promocode.service';
import { JwtAuthGuard } from '../../../libs/common/guard/jwt-auth.guard.guard';
import { CurrentUser } from '../../../libs/common/decorators/current-user.decorator';

class UsePromocodeDto {
  @IsString()
  @IsNotEmpty()
  promocode: string;
}

@Controller('promocode')
export class PromocodeController {
  constructor(private readonly promocodeService: PromocodeService) {}

  @Post('use')
  @UseGuards(JwtAuthGuard)
  async usePromocode(
    @CurrentUser() userId: string,
    @Body() body: UsePromocodeDto,
  ) {
    return this.promocodeService.usePromocode(userId, body.promocode);
  }
}

