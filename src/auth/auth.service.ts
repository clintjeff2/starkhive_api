import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import * as bcrypt from 'bcryptjs';
import { RegisterDto } from './dto/register-user.dto';
import { LogInDto } from './dto/loginDto';
import { LogInProvider } from './providers/loginProvider';

@Injectable()
export class AuthService {
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
