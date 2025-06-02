import { Body, Controller, Post, Request, UseGuards, ConflictException } from '@nestjs/common';
import { ApplicationsService } from './applications.service';
import { ApplyJobDto } from './dto/apply-job.dto';
import { JwtAuthGuard } from '../auth/guards/jwt.strategy';
import { RolesGuard } from '../auth/guards/role.guard';
import { RoleDecorator } from '../auth/decorators/role.decorator';
import { UserRole } from '../auth/enums/userRole.enum';

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
}
