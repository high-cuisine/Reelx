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
    this.logger.log(`Login attempt for: ${loginDto.login}`);
    
    let adminLogin = process.env.ADMIN_LOGIN || this.configService.get<string>('ADMIN_LOGIN');
    let adminPasswordHash = process.env.ADMIN_PASSWORD_HASH || this.configService.get<string>('ADMIN_PASSWORD_HASH');

    // Если хэш слишком короткий (меньше 50 символов), значит он был обрезан из-за $ символов
    // Пытаемся прочитать из .env файла напрямую
    if (adminPasswordHash && adminPasswordHash.length < 50) {
      this.logger.warn(`Password hash seems truncated (${adminPasswordHash.length} chars). Reading from .env file...`);
      
      try {
        const fs = require('fs');
        const path = require('path');
        const envPath = path.join(process.cwd(), '.env');
        
        if (fs.existsSync(envPath)) {
          const envContent = fs.readFileSync(envPath, 'utf-8');
          const lines = envContent.split('\n');
          
          for (const line of lines) {
            // Ищем строку с ADMIN_PASSWORD_HASH
            if (line.trim().startsWith('ADMIN_PASSWORD_HASH=')) {
              let hashValue = line.split('=')[1]?.trim() || '';
              
              // Убираем кавычки если есть (одинарные или двойные)
              if ((hashValue.startsWith('"') && hashValue.endsWith('"')) || 
                  (hashValue.startsWith("'") && hashValue.endsWith("'"))) {
                hashValue = hashValue.slice(1, -1);
              }
              
              if (hashValue.length > adminPasswordHash.length && hashValue.startsWith('$2b$')) {
                this.logger.log(`Found full hash in .env file (${hashValue.length} chars)`);
                adminPasswordHash = hashValue;
                break;
              }
            }
          }
        }
      } catch (error) {
        this.logger.warn(`Failed to read .env file: ${error.message}`);
      }
    }

    this.logger.log(`Admin login: ${adminLogin || 'NOT SET'}`);
    this.logger.log(`Password hash length: ${adminPasswordHash?.length || 0}`);
    this.logger.log(`Password hash preview: ${adminPasswordHash?.substring(0, 30) || 'empty'}...`);

    if (!adminLogin || !adminPasswordHash) {
      this.logger.error('ADMIN_LOGIN or ADMIN_PASSWORD_HASH not configured');
      this.logger.error(`ADMIN_LOGIN: ${adminLogin || 'NOT SET'}`);
      this.logger.error(`ADMIN_PASSWORD_HASH: ${adminPasswordHash ? 'SET (length: ' + adminPasswordHash.length + ')' : 'NOT SET'}`);
      throw new UnauthorizedException('Admin configuration error');
    }
    
    // Проверяем, что хэш имеет правильный формат bcrypt (должен начинаться с $2b$ или $2a$)
    if (!adminPasswordHash.startsWith('$2b$') && !adminPasswordHash.startsWith('$2a$')) {
      this.logger.error(`Invalid password hash format. Hash length: ${adminPasswordHash.length}`);
      this.logger.error(`Hash starts with: ${adminPasswordHash.substring(0, 20)}`);
      this.logger.error('Make sure ADMIN_PASSWORD_HASH in .env file is wrapped in quotes: ADMIN_PASSWORD_HASH=\'$2b$10$...\'');
      throw new UnauthorizedException('Admin configuration error');
    }

    // Проверяем логин
    this.logger.debug(`Comparing login: "${loginDto.login}" === "${adminLogin}"`);
    if (loginDto.login !== adminLogin) {
      this.logger.warn(`Failed login attempt with login: ${loginDto.login} (expected: ${adminLogin})`);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Проверяем пароль (сравниваем хэш)
    this.logger.debug(`Comparing password hash...`);
    const isPasswordValid = await bcrypt.compare(loginDto.password, adminPasswordHash);
    this.logger.debug(`Password comparison result: ${isPasswordValid}`);

    if (!isPasswordValid) {
      this.logger.warn(`Failed login attempt - invalid password for login: ${loginDto.login}`);
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
