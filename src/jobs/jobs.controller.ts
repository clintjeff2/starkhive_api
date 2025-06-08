import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Patch,
  Request,
} from '@nestjs/common';
import { JobsService } from './jobs.service';
import { UpdateJobStatusDto } from './dto/update-status.dto';
import { CreateJobDto } from './dto/create-job.dto';
feature/job-edit-budget-deadline
import { UpdateJobDto } from './dto/update-job.dto';
// TODO: Import AuthGuard once authentication is implemented

import { Request as ExpressRequest } from 'express';

interface RequestWithUser extends ExpressRequest {
  user?: {
    id: string;
  };
}
main

@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Post()
  create(@Body() createJobDto: CreateJobDto) {
    return this.jobsService.createJob(createJobDto);
  }

  @Get()
  findAll() {
    return this.jobsService.findAllJobs();
  }

  @Patch(':id/status')
  // TODO: Add @UseGuards(AuthGuard) once authentication is implemented
  async updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateJobStatusDto,
    @Request() req: RequestWithUser,
  ) {
    // TODO: Get userId from request once authentication is implemented
    const userId = req.user?.id || '1'; // Placeholder
    return this.jobsService.updateJobStatus(+id, updateStatusDto, userId);
  }

feature/job-edit-budget-deadline
  @Patch(':id/toggle-applications')
  // TODO: Add @UseGuards(AuthGuard) once authentication is implemented
  async toggleAcceptingApplications(
    @Param('id') id: string,
    @Body('isAcceptingApplications') isAcceptingApplications: boolean,
    // TODO: Add @Request() req once authentication is implemented
  ) {
    // TODO: Get userId from request once authentication is implemented
    const userId = 1; // Placeholder
    return this.jobsService.toggleAcceptingApplications(+id, isAcceptingApplications, userId);
  }

  @Patch(':id')
  // TODO: Add @UseGuards(AuthGuard) once authentication is implemented
  async updateJob(
    @Param('id') id: string,
    @Body() updateJobDto: UpdateJobDto,
    // TODO: Add @Request() req once authentication is implemented
  ) {
    // TODO: Get userId from request once authentication is implemented
    const userId = 1; // Placeholder
    return this.jobsService.updateJob(+id, updateJobDto, userId);

  @Post(':id/save')
  // TODO: Add @UseGuards(AuthGuard) once authentication is implemented
  async toggleSaveJob(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
  ) {
    // TODO: Get userId from request once authentication is implemented
    const userId = req.user?.id || '1'; // Placeholder
    return this.jobsService.toggleSaveJob(+id, userId);
  }

  @Get('saved')
  // TODO: Add @UseGuards(AuthGuard) once authentication is implemented
  async getSavedJobs(@Request() req: RequestWithUser) {
    // TODO: Get userId from request once authentication is implemented
    const userId = req.user?.id || '1'; // Placeholder
    return this.jobsService.getSavedJobs(userId);
  }

  @Get(':id/saved')
  // TODO: Add @UseGuards(AuthGuard) once authentication is implemented
  async isJobSaved(@Param('id') id: string, @Request() req: RequestWithUser) {
    // TODO: Get userId from request once authentication is implemented
    const userId = req.user?.id || '1'; // Placeholder
    return this.jobsService.isJobSaved(+id, userId);
main
  }

  @Patch(':id/toggle-applications')
  // TODO: Add @UseGuards(AuthGuard) once authentication is implemented
  async toggleAcceptingApplications(
    @Param('id') id: string,
    @Body('isAcceptingApplications') isAcceptingApplications: boolean,
    // TODO: Add @Request() req once authentication is implemented
  ) {
    // TODO: Get userId from request once authentication is implemented
    const userId = 1; // Placeholder
    return this.jobsService.toggleAcceptingApplications(+id, isAcceptingApplications, userId);
  }
}
