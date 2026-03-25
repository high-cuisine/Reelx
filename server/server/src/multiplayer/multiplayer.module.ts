import { Module } from '@nestjs/common';
import { MultiplayerController } from './multiplayer.controller';
import { MultiplayerService } from './multiplayer.service';
import { MultiplayerGateway } from './multiplayer.gateway';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule],
  controllers: [MultiplayerController],
  providers: [MultiplayerService, MultiplayerGateway],
})
export class MultiplayerModule {}
