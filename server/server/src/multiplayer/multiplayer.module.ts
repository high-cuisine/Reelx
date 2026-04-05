import { Module } from '@nestjs/common';
import { MultiplayerController } from './multiplayer.controller';
import { MultiplayerService } from './multiplayer.service';
import { MultiplayerGateway } from './multiplayer.gateway';
import { UsersModule } from '../users/users.module';
import { UpgrateModule } from '../upgrate/Upgrate.module';

@Module({
  imports: [UsersModule, UpgrateModule],
  controllers: [MultiplayerController],
  providers: [MultiplayerService, MultiplayerGateway],
})
export class MultiplayerModule {}
