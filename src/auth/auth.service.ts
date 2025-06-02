import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import * as bcrypt from 'bcryptjs';
import { RegisterDto } from './dto/register-user.dto';
import { ApiBody, ApiOperation } from '@nestjs/swagger';
import { LogInDto } from './dto/loginDto';
import { LogInProvider } from './providers/loginProvider';
import * as crypto from 'crypto';
import { addMinutes } from 'date-fns';
import { UserService } from 'src/user/user.service';
import { PasswordReset } from './entities/password-reset.entity';

@Injectable()
export class AuthService {
  mailService: any;
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    private readonly usersService: UserService,

     @InjectRepository(PasswordReset)
    private readonly passwordResetRepository:Repository<PasswordReset> ,

    /**
     * Injecting SignInProvider for authentication logic
     */
    private readonly signInProvider: LogInProvider,
  ) {}

  async register(registerDto: RegisterDto): Promise<Omit<User, 'password'>> {
    const { email, password, role } = registerDto;

    const existing = await this.userRepository.findOne({ where: { email } });
    if (existing) throw new Error('Email already exists');

    const hashed = await bcrypt.hash(password, 10);

    const user = this.userRepository.create({ email, password: hashed, role });
    const saved = await this.userRepository.save(user);

    const { password: _, ...safeUser } = saved;
    return safeUser;
  }

  @ApiOperation({ summary: 'User LogIn' })
  @ApiBody({ type: LogInDto })
  public async SignIn(loginDto: LogInDto) {
    return await this.signInProvider.Login(loginDto);
  }

  public async sendPasswordResetEmail(email: string): Promise<void> {
  const user = await this.usersService.findByEmail(email);
  if (!user) return; // don't reveal user existence

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = addMinutes(new Date(), 15);

  const reset = this.passwordResetRepository.create({ user, token, expiresAt });
  await this.passwordResetRepository.save(reset);

  const resetLink = `https://your-app.com/reset-password?token=${token}`;

  await this.mailService.sendEmail({
    to: user.email,
    subject: 'Password Reset Request',
    body: `Click the link to reset your password: ${resetLink}`,
  });
}

async resetPassword(token: string, newPassword: string): Promise<void> {
  const reset = await this.passwordResetRepository.findOne({
    where: { token },
    relations: ['user'],
  });

  if (!reset || reset.expiresAt < new Date()) {
    throw new BadRequestException('Invalid or expired reset token');
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  reset.user.password = hashedPassword;

  // await this.usersService.update(reset.user.id, reset.user); // or userRepository.save
  await this.passwordResetRepository.delete({ id: reset.id });
}
}
