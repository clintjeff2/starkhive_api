
import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Patch,
  Request,
  Delete,
  ParseIntPipe,
} from '@nestjs/common';
import { JobsService } from './jobs.service';
import { UpdateJobStatusDto } from './dto/update-status.dto';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { Request as ExpressRequest } from 'express';
import { GetUser } from 'src/auth/decorators/get-user.decorator';
import { User } from 'src/auth/entities/user.entity';

// Extend Express Request with user property
interface RequestWithUser extends ExpressRequest {
  user?: {
    id: string;
  };
}

// @Controller('jobs')
// export class JobsController {
//   constructor(private readonly jobsService: JobsService) {}

//   @Post()
//   create(@Body() createJobDto: CreateJobDto) {
//     return this.jobsService.createJob(createJobDto);
//   }

//   @Get()
//   findAll() {
//     return this.jobsService.findAllJobs();
//   }

  @Get('saved')
  async getSavedJobs(@GetUser() user: User) {
    return this.jobsService.getSavedJobs(user.id);
  }

  @Get(':id')
  async getById(@Param('id') id: number) {
    return this.jobsService.findJobById(id);
  }

  @Get(':id/saved')
  async isJobSaved(@Param('id') id: number, @GetUser() user: User) {
    return this.jobsService.isJobSaved(id, user.id);
  }

  @Patch(':id')
  async updateJob(
    @Param('id') id: number,
    @Body() updateJobDto: UpdateJobDto,
    @GetUser() user: User,
  ) {
    return this.jobsService.updateJob(id, updateJobDto, user.id);
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: number,
    @Body() updateStatusDto: UpdateJobStatusDto,
    @GetUser() user: User,
  ) {
    return this.jobsService.updateJobStatus(id, updateStatusDto, user.id);
  }

  @Patch(':id/toggle-applications')
  async toggleAcceptingApplications(
    @Param('id') id: number,
    @Body('isAcceptingApplications') isAcceptingApplications: boolean,
    @GetUser() user: User,
  ) {
    return this.jobsService.toggleAcceptingApplications(
      id,
      isAcceptingApplications,
      user.id,
    );
  }

  @Post(':id/save')
  async toggleSaveJob(@Param('id') id: number, @GetUser() user: User) {
    return this.jobsService.toggleSaveJob(id, user.id);
  }

  @Post(':id/restore')
  async restoreJob(
    @Param('id', ParseIntPipe) id: number, // Job ID is integer
    @GetUser() user: User,
  ) {
    return this.jobsService.restoreJob(id, user.id); // user.id is string UUID
  }

  @Delete(':id')
  async removeJob(
    @Param('id', ParseIntPipe) id: number, // Job ID is integer
    @GetUser() user: User,
  ) {
    return this.jobsService.removeJob(id, user.id); // user.id is string UUID
  }
}

