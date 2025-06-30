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
  ParseUUIDPipe,
  HttpStatus,
  HttpCode,
  Query,
} from '@nestjs/common';
import { JobsService } from './jobs.service';
import { UpdateJobStatusDto } from './dto/update-status.dto';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { Request as ExpressRequest } from 'express';
import { GetUser } from 'src/auth/decorators/get-user.decorator';
import { User } from 'src/auth/entities/user.entity';
import { Job } from './entities/job.entity';
import {
  CreateJobFromTemplateDto,
  CreateTemplateDto,
  UpdateTemplateDto,
} from './dto/job-template.dto';
import { JobTemplate } from './entities/job-template.entity';

// Extend Express Request with user property
interface RequestWithUser extends ExpressRequest {
  user?: {
    id: string;
  };
}

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

  @Get('saved')
  async getSavedJobs(@GetUser() user: User) {
    return this.jobsService.getSavedJobs(user.id);
  }

  @Get(':id')
  async getById(@Param('id', ParseIntPipe) id: number) {
    return this.jobsService.findJobById(id);
  }

  @Get(':id/saved')
  async isJobSaved(
    @Param('id', ParseIntPipe) id: number,
    @GetUser() user: User,
  ) {
    return this.jobsService.isJobSaved(id, user.id);
  }

  @Patch(':id')
  async updateJob(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateJobDto: UpdateJobDto,
    @GetUser() user: User,
  ) {
    return this.jobsService.updateJob(id, updateJobDto, user.id);
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateStatusDto: UpdateJobStatusDto,
    @GetUser() user: User,
  ) {
    return this.jobsService.updateJobStatus(id, updateStatusDto, user.id);
  }

  @Patch(':id/toggle-applications')
  async toggleAcceptingApplications(
    @Param('id', ParseIntPipe) id: number,
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
  async toggleSaveJob(
    @Param('id', ParseIntPipe) id: number,
    @GetUser() user: User,
  ) {
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

  @Post('templates')
  async createTemplate(
    @Body() createTemplateDto: CreateTemplateDto,
    @Request() req,
  ): Promise<JobTemplate> {
    // Assuming user info is available in request after authentication
    const userId =
      req.user?.id || req.user?.email || createTemplateDto.createdBy;
    return this.jobsService.createTemplate({
      ...createTemplateDto,
      createdBy: userId,
    });
  }

  @Get('templates')
  async findAllTemplates(
    @Query('category') category?: string,
    @Query('tags') tags?: string,
    @Query('includeShared') includeShared?: string,
    @Request() req?,
  ): Promise<JobTemplate[]> {
    const userId = req.user?.id || req.user?.email;
    const tagsArray = tags
      ? tags.split(',').map((tag) => tag.trim())
      : undefined;
    const includeSharedBool = includeShared !== 'false';

    return this.jobsService.findAllTemplates(
      userId,
      category,
      tagsArray,
      includeSharedBool,
    );
  }

  @Get('templates/categories')
  async getTemplateCategories(@Request() req): Promise<string[]> {
    const userId = req.user?.id || req.user?.email;
    return this.jobsService.getTemplateCategories(userId);
  }

  @Get('templates/tags')
  async getTemplateTags(@Request() req): Promise<string[]> {
    const userId = req.user?.id || req.user?.email;
    return this.jobsService.getTemplateTags(userId);
  }

  @Get('templates/stats')
  async getTemplateStats(@Request() req): Promise<any> {
    const userId = req.user?.id || req.user?.email;
    return this.jobsService.getTemplateStats(userId);
  }

  @Get('templates/:id')
  async findTemplateById(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req,
  ): Promise<JobTemplate> {
    const userId = req.user?.id || req.user?.email;
    return this.jobsService.findTemplateById(id, userId);
  }

  @Patch('templates/:id')
  async updateTemplate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateTemplateDto: UpdateTemplateDto,
    @Request() req,
  ): Promise<JobTemplate> {
    const userId = req.user?.id || req.user?.email;
    return this.jobsService.updateTemplate(id, updateTemplateDto, userId);
  }

  @Delete('templates/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteTemplate(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req,
  ): Promise<void> {
    const userId = req.user?.id || req.user?.email;
    return this.jobsService.deleteTemplate(id, userId);
  }

  @Post('templates/:id/share')
  async shareTemplate(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req,
  ): Promise<JobTemplate> {
    const userId = req.user?.id || req.user?.email;
    return this.jobsService.shareTemplate(id, userId);
  }

  @Post('templates/:id/unshare')
  async unshareTemplate(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req,
  ): Promise<JobTemplate> {
    const userId = req.user?.id || req.user?.email;
    return this.jobsService.unshareTemplate(id, userId);
  }

  @Post('templates/:id/create-job')
  async createJobFromTemplate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() createJobFromTemplateDto: CreateJobFromTemplateDto,
    @Request() req,
  ): Promise<Job> {
    const userId = req.user?.id || req.user?.email;
    return this.jobsService.createJobFromTemplate(
      { ...createJobFromTemplateDto, templateId: id },
      userId,
    );
  }
}
