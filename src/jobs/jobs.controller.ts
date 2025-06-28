import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Patch,
  Delete,
  Request,
  Query,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { JobsService } from './jobs.service';
import { RecommendationService } from './recommendation.service';
import { UpdateJobStatusDto } from './dto/update-status.dto';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { 
  GetRecommendationsDto, 
  UpdateRecommendationActionDto,
  RecommendationMetricsDto 
} from './dto/recommendation.dto';
import { Request as ExpressRequest } from 'express';
import { AuthGuardGuard } from '../auth/guards/auth.guard';

// Extend Express Request with user property
interface RequestWithUser extends ExpressRequest {
  user: {
    id: string;
  };
}

@Controller('jobs')
export class JobsController {
  constructor(
    private readonly jobsService: JobsService,
    private readonly recommendationService: RecommendationService,
  ) {}

  @Post()
  create(@Body() createJobDto: CreateJobDto) {
    return this.jobsService.createJob(createJobDto);
  }

  @Get()
  findAll() {
    return this.jobsService.findAllJobs();
  }

  @Get('recommendations')
  @UseGuards(AuthGuardGuard)
  async getRecommendations(
    @Query() query: GetRecommendationsDto,
    @Request() req: RequestWithUser,
  ) {
    if (!req.user?.id) {
      throw new UnauthorizedException('User not authenticated');
    }
    return this.recommendationService.generateRecommendations(req.user.id, query);
  }

  @Get('recommendations/metrics')
  @UseGuards(AuthGuardGuard)
  async getRecommendationMetrics(@Request() req: RequestWithUser): Promise<RecommendationMetricsDto> {
    if (!req.user?.id) {
      throw new UnauthorizedException('User not authenticated');
    }
    return this.recommendationService.getRecommendationMetrics(req.user.id);
  }

  @Patch('recommendations/:id/action')
  @UseGuards(AuthGuardGuard)
  async updateRecommendationAction(
    @Param('id') recommendationId: string,
    @Body() action: UpdateRecommendationActionDto,
    @Request() req: RequestWithUser,
  ) {
    if (!req.user?.id) {
      throw new UnauthorizedException('User not authenticated');
    }
    await this.recommendationService.updateRecommendationAction(recommendationId, action, req.user.id);
    return { message: 'Recommendation action updated successfully' };
  }

  @Patch(':id/status')
  @UseGuards(AuthGuardGuard)
  async updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateJobStatusDto,
    @Request() req: RequestWithUser,
  ) {
    if (!req.user?.id) {
      throw new UnauthorizedException('User not authenticated');
    }
    return this.jobsService.updateJobStatus(id, updateStatusDto, req.user.id);
  }

  @Patch(':id/toggle-applications')
  @UseGuards(AuthGuardGuard)
  async toggleAcceptingApplications(
    @Param('id') id: string,
    @Body('isAcceptingApplications') isAcceptingApplications: boolean,
    @Request() req: RequestWithUser,
  ) {
    if (!req.user?.id) {
      throw new UnauthorizedException('User not authenticated');
    }
    return this.jobsService.toggleAcceptingApplications(
      id,
      isAcceptingApplications,
      req.user.id,
    );
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.jobsService.findJobById(id);
  }

  @Patch(':id')
  @UseGuards(AuthGuardGuard)
  async updateJob(
    @Param('id') id: string,
    @Body() updateJobDto: UpdateJobDto,
    @Request() req: RequestWithUser,
  ) {
    if (!req.user?.id) {
      throw new UnauthorizedException('User not authenticated');
    }
    return this.jobsService.updateJob(id, updateJobDto, req.user.id);
  }

  @Delete(':id')
  @UseGuards(AuthGuardGuard)
  async removeJob(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
  ) {
    if (!req.user?.id) {
      throw new UnauthorizedException('User not authenticated');
    }
    return this.jobsService.removeJob(id, req.user.id);
  }

  @Post(':id/restore')
  @UseGuards(AuthGuardGuard)
  async restoreJob(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
  ) {
    if (!req.user?.id) {
      throw new UnauthorizedException('User not authenticated');
    }
    return this.jobsService.restoreJob(id, req.user.id);
  }

  @Post(':id/save')
  @UseGuards(AuthGuardGuard)
  async toggleSaveJob(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
  ) {
    if (!req.user?.id) {
      throw new UnauthorizedException('User not authenticated');
    }
    return this.jobsService.toggleSaveJob(id, req.user.id);
  }

  @Get('saved')
  @UseGuards(AuthGuardGuard)
  async getSavedJobs(@Request() req: RequestWithUser) {
    if (!req.user?.id) {
      throw new UnauthorizedException('User not authenticated');
    }
    return this.jobsService.getSavedJobs(req.user.id);
  }

  @Get(':id/saved')
  @UseGuards(AuthGuardGuard)
  async isJobSaved(@Param('id') id: string, @Request() req: RequestWithUser) {
    if (!req.user?.id) {
      throw new UnauthorizedException('User not authenticated');
    }
    return this.jobsService.isJobSaved(id, req.user.id);
  }
}
