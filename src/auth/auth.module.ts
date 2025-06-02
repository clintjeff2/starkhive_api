import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { User } from './entities/user.entity';
import { HashingProvider } from './providers/hashingProvider';
import { BcryptProvider } from './providers/bcrypt';
import { PasswordReset } from './entities/password-reset.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, PasswordReset])],
  providers: [AuthService,  {
      provide: HashingProvider, // Use the abstract class as a token
      useClass: BcryptProvider, // Bind it to the concrete implementation
    },],
  controllers: [AuthController],
  exports: [AuthService, TypeOrmModule, HashingProvider],
})
export class AuthModule {}
