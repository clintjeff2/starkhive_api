import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import * as bcrypt from 'bcryptjs';
import { RegisterDto } from './dto/register-user.dto';
import { LoginDto } from './dto/login-user.dto';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
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

    return this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET,
      expiresIn: process.env.JWT_EXPIRATION || '1h',
    });
  }
}
