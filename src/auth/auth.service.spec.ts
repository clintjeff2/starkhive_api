import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { PasswordReset } from './entities/password-reset.entity';
import { JwtService } from '@nestjs/jwt';
import { Portfolio } from './entities/portfolio.entity';
import { EmailToken } from './entities/email-token.entity';
import { ConfigService } from '@nestjs/config';
import { LogInProvider } from './providers/loginProvider';
import { TeamService } from './services/team.service';
import { MailService } from '../mail/mail.service';


describe('AuthService', () => {
  let service: AuthService;

  const mockUserRepository = {};
  const mockPasswordResetRepository = {};
  const mockMailService = { sendEmail: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(PasswordReset),
          useValue: mockPasswordResetRepository,
        },
        {
          provide: JwtService,
          useValue: { sign: jest.fn().mockReturnValue('mock-token') },
        },
        {
          provide: 'MAIL_SERVICE',
          useValue: mockMailService,
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

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
