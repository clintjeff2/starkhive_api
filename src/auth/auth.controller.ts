import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register-user.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { User } from './entities/user.entity';
import { RoleDecorator } from './decorators/role.decorator';
import { UserRole } from './enums/userRole.enum';
import { RolesGuard } from './guards/role.guard';
import { LogInDto } from './dto/loginDto';
import { AuthGuardGuard } from './guards/auth.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user as Freelancer or Recruiter' })
  @ApiResponse({
    status: 201,
    description: 'User successfully registered',
    type: User,
  })
  @ApiBadRequestResponse({
    description: 'Validation failed or email already exists',
  })
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('/signIn')
  @RoleDecorator(UserRole.ADMIN)
  @UseGuards(AuthGuardGuard, RolesGuard)
  @HttpCode(HttpStatus.OK)

  /**signin class */
  public async SignIn(@Body() signInDto: LogInDto) {
    return await this.authService.SignIn(signInDto);
  }

  @Post('request-password-reset')
async requestPasswordReset(@Body('email') email: string) {
  return this.authService.sendPasswordResetEmail(email);
}


@Post('reset-password')
async resetPassword(@Body() body: { token: string; newPassword: string }) {
  return this.authService.resetPassword(body.token, body.newPassword);
}

}
