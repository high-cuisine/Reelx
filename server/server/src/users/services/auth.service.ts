import { BadRequestException, Injectable } from '@nestjs/common';
import { UserLoginInterface } from '../interface/user-login.interface';
import { UserRepository } from '../repositorys/user.repository';
import { JwtService } from './jwt.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly userRepository: UserRepository, 
    private readonly jwtService: JwtService
) {}

  async register(registerDto: any): Promise<any> {
    return {};
  }

  async login(userData: UserLoginInterface): Promise<{ accessToken: string, refreshToken: string }> {
    let user = await this.userRepository.findUserByTelegramId(userData.telegramId);

    if(!user) {
      user = await this.userRepository.createUser(userData);
    }

    if(user.isBanned) {
      throw new BadRequestException('is Banned');
    }

    const { accessToken, refreshToken } = this.jwtService.generateTokens(user);
    
    return { accessToken, refreshToken };
  }

  async logout(userId: string): Promise<void> {}

  async refreshToken(refreshToken: string): Promise<any> {
    return {};
  }

  async validateUser(email: string, password: string): Promise<any> {
    // TODO: Implement user validation logic
    return null;
  }

  async getProfile(userId: string): Promise<any> {
    // TODO: Implement get user profile logic
    return {};
  }
}

