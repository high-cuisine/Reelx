import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { RedisModule } from '../../libs/infrustructure/redis/redis.module';
import { PrismaModule } from '../../libs/infrustructure/prisma/prisma.module';
import { AdminController } from './controllers/admin.controller';
import { AdminAuthService } from './services/admin-auth.service';
import { AdminSessionGuard } from './guards/admin-session.guard';
import { AdminPromocodesRepository } from './repositorys/admin-promocodes.repository';
import { AdminUsersRepository } from './repositorys/admin-users.repository';
import { AdminGamesRepository } from './repositorys/admin-games.repository';
import { AdminTransactionsRepository } from './repositorys/admin-transactions.repository';
import { AdminSettingsRepository } from './repositorys/admin-settings.repository';

const envFilePaths = [
  resolve(process.cwd(), '../.env'),
  resolve(process.cwd(), '.env'),
].filter((path) => existsSync(path));

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: envFilePaths.length ? envFilePaths : undefined,
    }),
    RedisModule,
    PrismaModule,
  ],
  controllers: [AdminController],
  providers: [
    AdminAuthService,
    AdminSessionGuard,
    AdminPromocodesRepository,
    AdminUsersRepository,
    AdminGamesRepository,
    AdminTransactionsRepository,
    AdminSettingsRepository,
  ],
  exports: [AdminAuthService, AdminSessionGuard],
})
export class AdminModule {}
