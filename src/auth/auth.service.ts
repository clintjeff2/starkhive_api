import { Injectable, UnauthorizedException, BadRequestException, NotImplementedException, Inject, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import * as bcrypt from 'bcryptjs';
import { RegisterDto } from './dto/register-user.dto';
import { LoginDto } from './dto/login-user.dto';
import { JwtService } from '@nestjs/jwt';
import { ApiBody, ApiOperation } from '@nestjs/swagger';
import * as crypto from 'crypto';
import { addMinutes } from 'date-fns';
import { UserService } from 'src/user/user.service';
import { PasswordReset } from './entities/password-reset.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly usersService: UserService,
    @InjectRepository(PasswordReset)
    private readonly passwordResetRepository: Repository<PasswordReset>,
    @Optional() @Inject('MAIL_SERVICE') public mailService?: any,
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

  async login(loginDto: LoginDto): Promise<string> {
    const { email, password } = loginDto;
    const user = await this.userRepository.findOneBy({ email: email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    return this.jwtService.sign(payload);
  }

  public async sendPasswordResetEmail(email: string): Promise<void> {
    const user = await this.usersService.findByEmail(email);
    if (!user || typeof user !== 'object') return; // don't reveal user existence
    const typedUser = user as User;

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = addMinutes(new Date(), 15);

    const reset = this.passwordResetRepository.create({ user: typedUser, token, expiresAt });
    await this.passwordResetRepository.save(reset);

    const resetLink = `https://your-app.com/reset-password?token=${token}`;

    await this.mailService?.sendEmail({
      to: typedUser.email,
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

  async getAdminAnalytics() {
    throw new NotImplementedException('getAdminAnalytics not implemented yet.');
  }
}
