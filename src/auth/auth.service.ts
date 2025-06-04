import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { UserRole } from './enums/userRole.enum';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import * as bcrypt from 'bcryptjs';
import { RegisterDto } from './dto/register-user.dto';
import { LogInDto } from './dto/loginDto';
import { LogInProvider } from './providers/loginProvider';

@Injectable()
export class AuthService {
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
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly loginProvider: LogInProvider
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

  async getOneByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }
  
  async sendPasswordResetEmail(email: string): Promise<any> {
    // implementation
  }

  async resetPassword(token: string, newPassword: string): Promise<any> {
    // implementation
  }

  async createPortfolio(userId: string, body: any, file: any): Promise<any> {
    // implementation
  }

  async updatePortfolio(userId: string, id: string, body: any, file: any): Promise<any> {
    // implementation
  }

  async deletePortfolio(userId: string, id: string): Promise<any> {
    // implementation
  }

  async getUserPortfolios(userId: string): Promise<any> {
    // implementation
    
  }
  
}
