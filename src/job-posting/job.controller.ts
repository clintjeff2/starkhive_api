import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Delete,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  Body,
} from '@nestjs/common';
import type { JobService } from './job.service';
import type { CreateJobDto } from './dto/create-job.dto';
import type { UpdateJobDto } from './dto/update-job.dto';
import type { JobQueryDto } from './dto/job-query.dto';
import type {
  JobResponseDto,
  PaginatedJobResponseDto,
} from './dto/job-response.dto';
import { ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { Job } from './entities/job.entity';
import {
  DisputeJobCompletionDto,
  MarkJobCompletedDto,
  ReviewJobCompletionDto,
} from './dto/job-completion.dto';

@Controller('jobs')
export class JobController {
  constructor(private readonly jobService: JobService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createJobDto: CreateJobDto): Promise<JobResponseDto> {
    return this.jobService.create(createJobDto);
  }

  @Get()
  async findAll(
    @Query() queryDto: JobQueryDto,
  ): Promise<PaginatedJobResponseDto> {
    return this.jobService.findAll(queryDto);
  }

  @Get('stats')
  async getStats(): Promise<any> {
    return this.jobService.getJobStats();
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<JobResponseDto> {
    const job = await this.jobService.findOne(id);
    // Increment view count when job is viewed
    await this.jobService.incrementViewCount(id);
    return job;
  }

  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateJobDto: UpdateJobDto,
  ): Promise<JobResponseDto> {
    return this.jobService.update(id, updateJobDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.jobService.remove(id);
  }

  @Post(':id/apply')
  @HttpCode(HttpStatus.OK)
  async applyToJob(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ message: string }> {
    // Increment application count
    await this.jobService.incrementApplicationCount(id);
    return { message: 'Application submitted successfully' };
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: string,
  ): Promise<JobResponseDto> {
    return this.jobService.update(id, { status } as UpdateJobDto);
  }

  @Patch(':id/feature')
  async toggleFeatured(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('isFeatured') isFeatured: boolean,
  ): Promise<JobResponseDto> {
    return this.jobService.update(id, { isFeatured });
  }

  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark job as completed by freelancer' })
  @ApiParam({ name: 'id', description: 'Job ID' })
  @ApiResponse({
    status: 200,
    description: 'Job marked as completed successfully',
  })
  @ApiResponse({ status: 404, description: 'Job not found' })
  @ApiResponse({
    status: 400,
    description: 'Job already completed or invalid status',
  })
  async markJobAsCompleted(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() markJobCompletedDto: MarkJobCompletedDto,
  ): Promise<Job> {
    return this.jobService.markJobAsCompleted(id, markJobCompletedDto);
  }

  @Patch(':id/review')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Review job completion (approve/reject) by recruiter',
  })
  @ApiParam({ name: 'id', description: 'Job ID' })
  @ApiResponse({
    status: 200,
    description: 'Job completion reviewed successfully',
  })
  @ApiResponse({ status: 404, description: 'Job not found' })
  @ApiResponse({ status: 400, description: 'Job not pending review' })
  async reviewJobCompletion(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() reviewJobCompletionDto: ReviewJobCompletionDto,
  ): Promise<Job> {
    return this.jobService.reviewJobCompletion(id, reviewJobCompletionDto);
  }

  @Post(':id/dispute')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Dispute job completion decision' })
  @ApiParam({ name: 'id', description: 'Job ID' })
  @ApiResponse({
    status: 200,
    description: 'Job completion disputed successfully',
  })
  @ApiResponse({ status: 404, description: 'Job not found' })
  @ApiResponse({
    status: 400,
    description: 'Cannot dispute job in current status',
  })
  async disputeJobCompletion(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() disputeJobCompletionDto: DisputeJobCompletionDto,
  ): Promise<Job> {
    return this.jobService.disputeJobCompletion(id, disputeJobCompletionDto);
  }

  @Get(':id/completion-status')
  @ApiOperation({
    summary: 'Get job completion status and auto-release countdown',
  })
  @ApiParam({ name: 'id', description: 'Job ID' })
  @ApiResponse({
    status: 200,
    description: 'Job completion status retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Job not found' })
  async getJobCompletionStatus(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{
    job: Job;
    daysUntilAutoRelease?: number;
  }> {
    return this.jobService.getJobCompletionStatus(id);
  }

  // Existing CRUD endpoints would go here...
  // @Post()
  // async create(@Body() createJobDto: CreateJobDto): Promise<Job> { ... }

  // @Get()
  // async findAll(): Promise<Job[]> { ... }

  // @Get(':id')
  // async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Job> { ... }

  // @Patch(':id')
  // async update(
  //   @Param('id', ParseUUIDPipe) id: string,
  //   @Body() updateJobDto: UpdateJobDto,
  // ): Promise<Job> { ... }

  // @Delete(':id')
  // async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> { ... }
}
