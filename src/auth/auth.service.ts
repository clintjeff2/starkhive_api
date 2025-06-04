import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { UserRole } from './enums/userRole.enum';
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
import { MailService } from '../mail/mail.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  /**
   * Promote a user to admin. Only super admins can perform this action.
   * @param requesterId - ID of the user making the request
   * @param targetUserId - ID of the user to be promoted
   */
  async promoteToAdmin(requesterId: string, targetUserId: string): Promise<User> {
    // Get the requesting user
    const requester = await this.userRepository.findOne({ where: { id: requesterId } });
    if (!requester || requester.role !== UserRole.SUPER_ADMIN) {
      throw new UnauthorizedException('Only super admins can promote users to admin');
    }
    // Get the target user
    const targetUser = await this.userRepository.findOne({ where: { id: targetUserId } });
    if (!targetUser) {
      throw new BadRequestException('Target user does not exist');
    }
    // Update the role
    targetUser.role = UserRole.ADMIN;
    await this.userRepository.save(targetUser);
    return targetUser;
  }

  // TODO: Move allowedMimeTypes and maxFileSize to configuration
  private allowedMimeTypes: string[];
  private maxFileSize: number;
  
  constructor(
    private readonly mailService: MailService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Portfolio)
    private readonly portfolioRepository: Repository<Portfolio>,
    private readonly jwtService: JwtService,
    private readonly usersService: UserService,
    @InjectRepository(PasswordReset)
    private readonly passwordResetRepository: Repository<PasswordReset>,
    private readonly configService: ConfigService,
  ) {
    this.allowedMimeTypes = this.configService.get<string[]>('portfolio.allowedMimeTypes', ['image/jpeg', 'image/png', 'application/pdf']);
    this.maxFileSize = this.configService.get<number>('portfolio.maxFileSize', 5 * 1024 * 1024);
  }

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
      role: user.role
    };
    return this.jwtService.sign(payload);
  }
}