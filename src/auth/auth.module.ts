import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { User } from './entities/user.entity';
import { HashingProvider } from './providers/hashingProvider';
import { BcryptProvider } from './providers/bcrypt';
import { PasswordReset } from './entities/password-reset.entity';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MailService } from '../mail/mail.service';
import { LogInProvider } from './providers/loginProvider';
import { GenerateTokensProvider } from './providers/generateTokensProvider';
import { Portfolio } from './entities/portfolio.entity';
import { EmailToken } from './entities/email-token.entity';
import { Team } from './entities/team.entity';
import { TeamMember } from './entities/team-member.entity';
import { TeamActivity } from './entities/team-activity.entity';
import { TeamService } from './services/team.service';
import { MailModule } from 'src/mail/mail.module';
import { ApiKey } from './entities/api-key.entity';
import { ApiKeyService } from './services/api-key.service';
import { ApiKeyGuard } from './guards/api-key.guard';
import { ApiKeyController } from './controllers/api-key.controller';

@Module({
  imports: [
    MailModule,
    ConfigModule.forRoot(),
    TypeOrmModule.forFeature([
      User,
      PasswordReset,
      Portfolio,
      EmailToken,
      Team,
      TeamMember,
      TeamActivity,
      ApiKey,
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const secret = configService.get<string>('JWT_SECRET');
        if (!secret) {
          throw new Error('JWT_SECRET environment variable is required');
        }
        return {
          secret,
          signOptions: { expiresIn: '1h' },
        };
      },
      global: true,
    }),
  ],
  controllers: [AuthController, ApiKeyController],
  providers: [
    AuthService,
    TeamService,
    LogInProvider,
    GenerateTokensProvider,
    JwtService,
    MailService,
    ApiKeyService,
    ApiKeyGuard,
    {
      provide: HashingProvider,
      useClass: BcryptProvider,
    },
  ],
  exports: [
    AuthService,
    TeamService,
    TypeOrmModule,
    HashingProvider,
    MailService,
    JwtService,
    GenerateTokensProvider,
  ],
})
export class AuthModule {}
