// import { Controller, Post, Body, Get, Param, Patch, Delete, UseGuards } from '@nestjs/common';
// import { JobsService } from './jobs.service';
// import { UpdateJobStatusDto } from './dto/update-status.dto';
// import { CreateJobDto } from './dto/create-job.dto';
// // TODO: Import AuthGuard once authentication is implemented
// import { GetUser } from 'src/auth/decorators/get-user.decorator';
// import { User } from 'src/auth/entities/user.entity';
// import {
//   Controller,
//   Post,
//   Body,
//   Get,
//   Param,
//   Patch,
//   Request,
// } from '@nestjs/common';
// import { JobsService } from './jobs.service';
// import { UpdateJobStatusDto } from './dto/update-status.dto';
// import { CreateJobDto } from './dto/create-job.dto';
// import { UpdateJobDto } from './dto/update-job.dto';
// import { Request as ExpressRequest } from 'express';

// // Extend Express Request with user property
// interface RequestWithUser extends ExpressRequest {
//   user?: {
//     id: string;
//   };
// }

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

//   @Patch(':id/status')
//   async updateStatus(
//     @Param('id', { transform: (value: string) => parseInt(value, 10) }) id: number,
//     @Body() updateStatusDto: UpdateJobStatusDto,
//     @GetUser() user: User,
//   ) {
//     return this.jobsService.updateJobStatus(id, updateStatusDto, user.id);
//   }

//   @Delete(':id')
//   // TODO: Add @UseGuards(AuthGuard) once authentication is implemented
//   async removeJob(
//     @Param('id', { transform: (value: string) => parseInt(value, 10) }) id: number,
//     @GetUser() user: User,
//   ) {
//     return this.jobsService.removeJob(id, user.id);
//   }

//   @Post(':id/restore')
//   // TODO: Add @UseGuards(AuthGuard) once authentication is implemented
//   async restoreJob(
//     @Param('id', { transform: (value: string) => parseInt(value, 10) }) id: number,
//     @GetUser() user: User,
//   ) {
//     return this.jobsService.restoreJob(id, user.id);
//     @Param('id') id: string, // Changed from parsing to number
//     @Body() updateStatusDto: UpdateJobStatusDto,
//     @Request() req: RequestWithUser,
//   ) {
//     const userId = req.user?.id || '1'; // Placeholder
//     return this.jobsService.updateJobStatus(id, updateStatusDto, userId);
//   }

//   @Patch(':id/toggle-applications')
//   async toggleAcceptingApplications(
//     @Param('id') id: string, // Changed from parsing to number
//     @Body('isAcceptingApplications') isAcceptingApplications: boolean,
//     @Request() req: RequestWithUser,
//   ) {
//     const userId = req.user?.id || '1'; // Placeholder
//     return this.jobsService.toggleAcceptingApplications(
//       id,
//       isAcceptingApplications,
//       userId,
//     );
//   }

//   @Get(':id')
//   async getById(@Param('id') id: string) {
//     // Fixed: should be findJobById, not findApplicationById
//     return this.jobsService.findJobById(id);
//   }

//   @Patch(':id')
//   async updateJob(
//     @Param('id') id: string, // Changed from parsing to number
//     @Body() updateJobDto: UpdateJobDto,
//     @Request() req: RequestWithUser,
//   ) {
//     const userId = req.user?.id || '1'; // Placeholder
//     return this.jobsService.updateJob(id, updateJobDto, userId);
//   }

//   @Post(':id/save')
//   async toggleSaveJob(
//     @Param('id') id: string, // Changed from parsing to number
//     @Request() req: RequestWithUser,
//   ) {
//     const userId = req.user?.id || '1'; // Placeholder
//     return this.jobsService.toggleSaveJob(id, userId);
//   }

//   @Get('saved')
//   async getSavedJobs(@Request() req: RequestWithUser) {
//     const userId = req.user?.id || '1'; // Placeholder
//     return this.jobsService.getSavedJobs(userId);
//   }

//   @Get(':id/saved')
//   async isJobSaved(@Param('id') id: string, @Request() req: RequestWithUser) {
//     const userId = req.user?.id || '1'; // Placeholder
//     return this.jobsService.isJobSaved(id, userId);
//   }
// }
