import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register-user.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBadRequestResponse } from '@nestjs/swagger';
import { User } from './entities/user.entity';
import { Auth } from './decorators/auth.decorator';
import { authTypes } from './enums/authTypes.enum';
import { RoleDecorator } from './decorators/role.decorator';
import { UserRole } from './enums/userRole.enum';
import { RolesGuard } from './guards/role.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @RoleDecorator(UserRole.ADMIN)
  // Import and add the jwt auth guard
  @UseGuards(/* JwtAuthGuard, */ RolesGuard)
  @ApiOperation({ summary: 'Register a new user as Freelancer or Recruiter' })
  @ApiResponse({
    status: 201,
    description: 'User successfully registered',
    type: User, 
  })
  @ApiBadRequestResponse({ description: 'Validation failed or email already exists' })
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }
}
