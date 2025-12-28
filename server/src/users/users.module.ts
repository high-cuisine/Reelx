import { forwardRef, Module } from '@nestjs/common';
import { AuthController } from './controllers/auth.controller';
import { UserController } from './controllers/user.contoller';
import { AuthService } from './services/auth.service';
import { UsersService } from './services/users.service';
import { JwtService } from './services/jwt.service';
import { UserRepository } from './repositorys/user.repository';
import { JwtAuthGuard } from '../../libs/common/guard/jwt-auth.guard.guard';
import { TelegramBotModule } from '../telegram-bot/telegram-bot.module';

@Module({
  imports: [forwardRef(() => TelegramBotModule)],
  controllers: [AuthController, UserController],
  providers: [AuthService, UsersService, JwtService, UserRepository, JwtAuthGuard],
  exports: [AuthService, UsersService, JwtService, UserRepository, JwtAuthGuard],
})
export class UsersModule {}
