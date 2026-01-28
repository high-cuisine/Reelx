import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { RedisService } from '../../../libs/infrustructure/redis/redis.service';
import { AdminLoginDto, AdminLoginResponse } from '../dto/admin-login.dto';

@Injectable()
export class AdminAuthService {
  private readonly logger = new Logger(AdminAuthService.name);
  private readonly SESSION_TTL_SECONDS = 24 * 60 * 60; // 24 часа

  constructor(
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {}

  async login(loginDto: AdminLoginDto): Promise<AdminLoginResponse> {
    const adminLogin = this.configService.get<string>('ADMIN_LOGIN');
    const adminPasswordHash = this.configService.get<string>('ADMIN_PASSWORD_HASH');

    if (!adminLogin || !adminPasswordHash) {
      this.logger.error('ADMIN_LOGIN or ADMIN_PASSWORD_HASH not configured');
      throw new UnauthorizedException('Admin configuration error');
    }

    // Проверяем логин
    if (loginDto.login !== adminLogin) {
      this.logger.warn(`Failed login attempt with login: ${loginDto.login}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Проверяем пароль (сравниваем хэш)
    const isPasswordValid = await bcrypt.compare(loginDto.password, adminPasswordHash);

    if (!isPasswordValid) {
      this.logger.warn(`Failed login attempt with login: ${loginDto.login}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    this.logger.log(`Admin logged in successfully: ${loginDto.login}`);

    // Генерируем sessionId
    const sessionId = randomUUID();

    // Сохраняем сессию в Redis
    const sessionKey = `admin:session:${sessionId}`;
    const sessionData = JSON.stringify({
      login: adminLogin,
      createdAt: new Date().toISOString(),
    });

    await this.redisService.set(sessionKey, sessionData, this.SESSION_TTL_SECONDS);

    this.logger.log(`Admin session created: ${sessionId}`);

    return {
      sessionId,
    };
  }

  async validateSession(sessionId: string): Promise<boolean> {
    if (!sessionId) {
      return false;
    }

    const sessionKey = `admin:session:${sessionId}`;
    const sessionData = await this.redisService.get(sessionKey);

    if (!sessionData) {
      return false;
    }

    // Обновляем TTL сессии при проверке (продлеваем сессию)
    await this.redisService.set(sessionKey, sessionData, this.SESSION_TTL_SECONDS);

    return true;
  }

  async logout(sessionId: string): Promise<void> {
    if (!sessionId) {
      return;
    }

    const sessionKey = `admin:session:${sessionId}`;
    await this.redisService.del(sessionKey);

    this.logger.log(`Admin session deleted: ${sessionId}`);
  }
}
