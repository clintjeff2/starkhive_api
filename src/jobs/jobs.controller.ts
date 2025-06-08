import { Controller, Post, Body, Get, Param, Patch, Delete, UseGuards } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { UpdateJobStatusDto } from './dto/update-status.dto';
import { CreateJobDto } from './dto/create-job.dto';
// TODO: Import AuthGuard once authentication is implemented
import { GetUser } from 'src/auth/decorators/get-user.decorator';
import { User } from 'src/auth/entities/user.entity';

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
    @Param('id', { transform: (value: string) => parseInt(value, 10) }) id: number,
    @Body() updateStatusDto: UpdateJobStatusDto,
    @GetUser() user: User,
  ) {
    return this.jobsService.updateJobStatus(id, updateStatusDto, user.id);
  }

  @Delete(':id')
  // TODO: Add @UseGuards(AuthGuard) once authentication is implemented
  async removeJob(
    @Param('id', { transform: (value: string) => parseInt(value, 10) }) id: number,
    @GetUser() user: User,
  ) {
    return this.jobsService.removeJob(id, user.id);
  }

  @Post(':id/restore')
  // TODO: Add @UseGuards(AuthGuard) once authentication is implemented
  async restoreJob(
    @Param('id', { transform: (value: string) => parseInt(value, 10) }) id: number,
    @GetUser() user: User,
  ) {
    return this.jobsService.restoreJob(id, user.id);
  }
}
