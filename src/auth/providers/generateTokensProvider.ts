import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { User } from '../entities/user.entity';

@Injectable()
export class GenerateTokensProvider {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  private get jwtConfiguration() {
    return {
      secret: this.configService.get<string>('JWT_SECRET') || 'defaultSecret',
      ttl: this.configService.get<string>('JWT_TTL') || '1h',
    };
  }

  private signToken(
    userId: string,
    role: string,
    expiresIn: string,
    payload?: Record<string, any>,
  ): string {
    return this.jwtService.sign(
      {
        sub: userId,
        role,
        ...payload,
      },
      {
        secret: this.jwtConfiguration.secret,
        expiresIn,
      },
    );
  }

  async generateTokens(user: User): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const accessToken = this.signToken(
      user.id,
      user.role,
      this.jwtConfiguration.ttl,
      { email: user.email },
    );

    const refreshToken = this.signToken(
      user.id,
      user.role,
      this.configService.get<string>('JWT_REFRESH_TTL') || '7d', // fallback to 7 days
    );

    return {
      accessToken,
      refreshToken,
    };
  }
}
