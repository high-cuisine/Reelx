import { Module } from '@nestjs/common';
import { PrismaModule } from '../../libs/infrustructure/prisma/prisma.module';
import { WinsGateway } from './wins.gateway';
import { WinsService } from './wins.service';

@Module({
  imports: [PrismaModule],
  providers: [WinsGateway, WinsService],
  exports: [WinsService],
})
export class WinsModule {}

