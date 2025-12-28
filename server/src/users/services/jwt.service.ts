import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { User } from '@prisma/client';

interface TokenPayload {
  userId: string;
  username: string;
  photoUrl: string | null;
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class JwtService {
  constructor() {}

  generateTokens(user: User): TokenPair {
    const payload: TokenPayload = {
      userId: user.id,
      username: user.username,
      photoUrl: user.photoUrl,
    };
    const accessToken = this.generateToken(payload, '1h');
    const refreshToken = this.generateToken(payload, '7d');
    return { accessToken, refreshToken };
  }

  validateToken(token: string): TokenPayload {
    try {
      const secret = this.getJwtSecret();
      const decoded = jwt.verify(token, secret) as TokenPayload;
      return decoded;
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  private generateToken(payload: TokenPayload, expiresIn: string): string {
    const secret = this.getJwtSecret();
    return jwt.sign(payload, secret, { expiresIn } as jwt.SignOptions);
  }

  private getJwtSecret(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET is not set in environment variables');
    }
    return secret;
  }
}