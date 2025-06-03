import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { Portfolio } from './entities/portfolio.entity';
import * as bcrypt from 'bcryptjs';
import { RegisterDto } from './dto/register-user.dto';
import { LoginDto } from './dto/login-user.dto';
import { CreatePortfolioDto } from './dto/create-portfolio.dto';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { addMinutes } from 'date-fns';
import { UserService } from 'src/user/user.service';
import { PasswordReset } from './entities/password-reset.entity';

@Injectable()
export class AuthService {
  mailService: any;
  private allowedMimeTypes = ['image/jpeg', 'image/png', 'application/pdf'];
  private maxFileSize = 5 * 1024 * 1024;

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Portfolio)
    private readonly portfolioRepository: Repository<Portfolio>,
    private readonly jwtService: JwtService,
    private readonly usersService: UserService,
    @InjectRepository(PasswordReset)
    private readonly passwordResetRepository: Repository<PasswordReset>,
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
    if (!user) return; // don't reveal user existence
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = addMinutes(new Date(), 15);
    const reset = this.passwordResetRepository.create({ user: user, token, expiresAt });
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

  // --- Portfolio Methods ---
  async createPortfolio(userId: string, dto: CreatePortfolioDto, file: any): Promise<Portfolio> {
    if (!file) throw new BadRequestException('File is required');
    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Invalid file type. Only JPEG, PNG, and PDF are allowed.');
    }
    if (file.size > this.maxFileSize) {
      throw new BadRequestException('File size exceeds the 5MB limit.');
    }
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');
    const fileUrl = `/uploads/portfolio/${file.filename}`;
    const portfolio = this.portfolioRepository.create({
      title: dto.title,
      description: dto.description,
      fileUrl,
      user,
    });
    return this.portfolioRepository.save(portfolio);
  }

  async updatePortfolio(userId: string, portfolioId: string, dto: Partial<CreatePortfolioDto>, file?: any): Promise<Portfolio> {
    const portfolio = await this.portfolioRepository.findOne({ where: { id: portfolioId }, relations: ['user'] });
    if (!portfolio || portfolio.user.id !== userId) {
      throw new UnauthorizedException('Portfolio not found or access denied');
    }
    if (dto.title) portfolio.title = dto.title;
    if (dto.description) portfolio.description = dto.description;
    if (file) {
      if (!this.allowedMimeTypes.includes(file.mimetype)) {
        throw new BadRequestException('Invalid file type. Only JPEG, PNG, and PDF are allowed.');
      }
      if (file.size > this.maxFileSize) {
        throw new BadRequestException('File size exceeds the 5MB limit.');
      }
      portfolio.fileUrl = `/uploads/portfolio/${file.filename}`;
    }
    return this.portfolioRepository.save(portfolio);
  }

  async deletePortfolio(userId: string, portfolioId: string): Promise<void> {
    const portfolio = await this.portfolioRepository.findOne({ where: { id: portfolioId }, relations: ['user'] });
    if (!portfolio || portfolio.user.id !== userId) {
      throw new UnauthorizedException('Portfolio not found or access denied');
    }
    await this.portfolioRepository.remove(portfolio);
  }

  async getUserPortfolios(userId: string): Promise<Portfolio[]> {
    return this.portfolioRepository.find({ where: { user: { id: userId } }, order: { createdAt: 'DESC' } });
  }
}
