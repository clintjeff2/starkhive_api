import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register-user.dto';
import { LogInDto } from './dto/loginDto';
import { User } from './entities/user.entity';
import { FeedService } from '../feed/feed.service';
import { JobsService } from '../jobs/jobs.service';

import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';

import { RoleDecorator } from './decorators/role.decorator';
import { UserRole } from './enums/userRole.enum';
import { RolesGuard } from './guards/role.guard';
import { AuthGuardGuard } from './guards/auth.guard';
import { AuthGuard } from '@nestjs/passport';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly feedService: FeedService,
    private readonly jobsService: JobsService,
  ) {}

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

  @Post('signIn')
  @RoleDecorator(UserRole.ADMIN)
  @UseGuards(AuthGuardGuard, RolesGuard)
  @HttpCode(HttpStatus.OK)
  async SignIn(@Body() signInDto: LogInDto) {
    return this.authService.SignIn(signInDto);
  }

  @Post('request-password-reset')
  async requestPasswordReset(@Body('email') email: string) {
    return this.authService.sendPasswordResetEmail(email);
  }

  @Post('reset-password')
  async resetPassword(@Body() body: { token: string; newPassword: string }) {
    return this.authService.resetPassword(body.token, body.newPassword);

  @Get('admin/analytics')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @RoleDecorator(UserRole.ADMIN)
  async getAdminAnalytics() {
    const postsStats = await this.feedService.getWeeklyNewPostsCount();
    const jobsStats = await this.jobsService.getWeeklyNewJobsCount();
    const applicationsStats = await this.jobsService.getWeeklyNewApplicationsCount();

    return {
      posts: postsStats,
      jobs: jobsStats,
      applications: applicationsStats,
    };
  }
}
