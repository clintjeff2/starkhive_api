import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Portfolio } from './entities/portfolio.entity';
import { EmailToken } from './entities/email-token.entity';
import { PasswordReset } from './entities/password-reset.entity';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { LogInProvider } from './providers/loginProvider';
import { TeamService } from './services/team.service';
import { MailService } from '../mail/mail.service';

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: {},
        },
        {
          provide: getRepositoryToken(Portfolio),
          useValue: {},
        },
        {
          provide: getRepositoryToken(EmailToken),
          useValue: {},
        },
        {
          provide: getRepositoryToken(PasswordReset),
          useValue: {},
        },
        {
          provide: JwtService,
          useValue: { sign: jest.fn().mockReturnValue('mock-token') },
        },
        {
          provide: ConfigService,
          useValue: {},
        },
        {
          provide: LogInProvider,
          useValue: {},
        },
        {
          provide: TeamService,
          useValue: {},
        },
        {
          provide: MailService,
          useValue: { sendEmail: jest.fn(), sendVerificationEmail: jest.fn() },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
