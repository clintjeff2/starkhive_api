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

// Extend Express Request with user property
interface RequestWithUser extends ExpressRequest {
  user?: {
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
  async getRecommendations(
    @Query() query: GetRecommendationsDto,
    @Request() req: RequestWithUser,
  ) {
    const userId = req.user?.id || '1'; // Placeholder - replace with actual auth
    return this.recommendationService.generateRecommendations(userId, query);
  }

  @Get('recommendations/metrics')
  async getRecommendationMetrics(@Request() req: RequestWithUser): Promise<RecommendationMetricsDto> {
    const userId = req.user?.id || '1'; // Placeholder - replace with actual auth
    return this.recommendationService.getRecommendationMetrics(userId);
  }

  @Patch('recommendations/:id/action')
  async updateRecommendationAction(
    @Param('id') recommendationId: string,
    @Body() action: UpdateRecommendationActionDto,
  ) {
    await this.recommendationService.updateRecommendationAction(recommendationId, action);
    return { message: 'Recommendation action updated successfully' };
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateJobStatusDto,
    @Request() req: RequestWithUser,
  ) {
    const userId = req.user?.id || '1'; // Placeholder
    return this.jobsService.updateJobStatus(id, updateStatusDto, userId);
  }

  @Patch(':id/toggle-applications')
  async toggleAcceptingApplications(
    @Param('id') id: string,
    @Body('isAcceptingApplications') isAcceptingApplications: boolean,
    @Request() req: RequestWithUser,
  ) {
    const userId = req.user?.id || '1'; // Placeholder
    return this.jobsService.toggleAcceptingApplications(
      id,
      isAcceptingApplications,
      userId,
    );
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.jobsService.findJobById(id);
  }

  @Patch(':id')
  async updateJob(
    @Param('id') id: string,
    @Body() updateJobDto: UpdateJobDto,
    @Request() req: RequestWithUser,
  ) {
    const userId = req.user?.id || '1'; // Placeholder
    return this.jobsService.updateJob(id, updateJobDto, userId);
  }

  @Delete(':id')
  async removeJob(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
  ) {
    const userId = req.user?.id || '1'; // Placeholder
    return this.jobsService.removeJob(parseInt(id), parseInt(userId));
  }

  @Post(':id/restore')
  async restoreJob(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
  ) {
    const userId = req.user?.id || '1'; // Placeholder
    return this.jobsService.restoreJob(parseInt(id), parseInt(userId));
  }

  @Post(':id/save')
  async toggleSaveJob(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
  ) {
    const userId = req.user?.id || '1'; // Placeholder
    return this.jobsService.toggleSaveJob(id, userId);
  }

  @Get('saved')
  async getSavedJobs(@Request() req: RequestWithUser) {
    const userId = req.user?.id || '1'; // Placeholder
    return this.jobsService.getSavedJobs(userId);
  }

  @Get(':id/saved')
  async isJobSaved(@Param('id') id: string, @Request() req: RequestWithUser) {
    const userId = req.user?.id || '1'; // Placeholder
    return this.jobsService.isJobSaved(id, userId);
  }
}
