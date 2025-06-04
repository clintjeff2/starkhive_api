import { Body, Controller, Post, Request, UseGuards, ConflictException, Get, Param, ParseIntPipe, Req } from '@nestjs/common';
import { ApplicationsService } from './applications.service';
import { ApplyJobDto } from './dto/apply-job.dto';
import { JwtAuthGuard } from '../auth/guards/jwt.strategy';
import { RolesGuard } from '../auth/guards/role.guard';
import { RoleDecorator } from '../auth/decorators/role.decorator';
import { UserRole } from '../auth/enums/userRole.enum';
import { User } from 'src/auth/entities/user.entity';
import { GetUser } from 'src/auth/decorators/get-user.decorator';

@Controller('applications')
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @Post('apply')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @RoleDecorator(UserRole.FREELANCER)
  async applyForJob(@Body() applyJobDto: ApplyJobDto, @Request() req) {
    const freelancerId = req.user.id;
    // recruiterId should be fetched from job or passed in DTO in a real app
    // For now, assume recruiterId is provided in the DTO or fetched elsewhere
    const recruiterId = req.body.recruiterId || null;
    if (!recruiterId) {
      throw new ConflictException('Recruiter ID is required');
    }
    return this.applicationsService.applyForJob(
      applyJobDto.jobId,
      freelancerId,
      recruiterId,
      applyJobDto.coverLetter,
    );
  }

  @Get('my')
  @RoleDecorator(UserRole.FREELANCER)
  async getMyApplications(@GetUser() user: User) {
    const applications = await this.applicationsService.getApplicationsByUser(user.id);

    return applications.map((app) => ({
      jobTitle: app.job.title,
      submittedAt: app.createdAt,
      status: app.status,
    }));
  }

  @Get('job/:jobId')
@UseGuards(JwtAuthGuard)
async getApplicationsByJob(
  @Param('jobId') jobId: number,
  @Req() req: any,
) {
  const recruiterId = req.user.id;
  return this.applicationsService.findApplicationsByJobId(jobId, recruiterId);
}
}
