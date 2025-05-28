import { IsEmail, IsEnum, MinLength } from 'class-validator';
import { UserRole } from '../enums/userRole.enum';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Password (minimum 6 characters)',
    minLength: 6,
    example: 'strongPassword123',
  })
  @MinLength(6)
  password: string;

  @ApiProperty({
    description: 'Role of the user',
    enum: UserRole,
    example: UserRole.FREELANCER,
  })
  @IsEnum(UserRole)
  role: UserRole;
}
