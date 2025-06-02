import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import * as bcrypt from 'bcryptjs';
import { RegisterDto } from './dto/register-user.dto';
import { ApiBody, ApiOperation } from '@nestjs/swagger';
import { LogInDto } from './dto/loginDto';
import { LogInProvider } from './providers/loginProvider';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

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
}
