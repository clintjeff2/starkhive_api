import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Inject,
  BadRequestException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, IsNull, DataSource } from 'typeorm';
import { Application } from 'src/applications/entities/application.entity';
import { SavedJob } from './entities/saved-job.entity';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { CreateApplicationDto } from 'src/applications/dto/create-application.dto';
import { UpdateApplicationDto } from 'src/applications/dto/update-application.dto';
import { UpdateJobStatusDto } from './dto/update-status.dto';
import { AntiSpamService } from '../anti-spam/anti-spam.service';
import {
  JobResponseDto,
  PaginatedJobResponseDto,
} from 'src/job-posting/dto/job-response.dto';
import { JobAdapter } from './adapters/job.adapter';
import { JobTemplate } from './entities/job-template.entity';
import {
  CreateJobFromTemplateDto,
  CreateTemplateDto,
  UpdateTemplateDto,
} from './dto/job-template.dto';
import { Job, JobStatus, CompletionStatus } from './entities/job.entity';

@Injectable()
export class JobsService {
  constructor(
    @InjectRepository(Job)
    private readonly jobRepository: Repository<Job>,

    @InjectRepository(Application)
    private readonly applicationRepository: Repository<Application>,

    @InjectRepository(SavedJob)
    private readonly savedJobRepository: Repository<SavedJob>,

    private readonly antiSpamService: AntiSpamService,
    @Inject(DataSource)
    private dataSource: DataSource,

    @InjectRepository(JobTemplate)
    private templateRepository: Repository<JobTemplate>,
  ) {}

  async createJob(createJobDto: CreateJobDto): Promise<Job> {
    const job = this.jobRepository.create(createJobDto);
    const saved = await this.jobRepository.save(job);

    try {
      // Anti-spam analysis using the correct Job entity properties
      const jobForAnalysis = {
        ...saved,
        main: saved.description || '',
        freelancerts: [], // Empty array as per your entity structure
      } as any;

      const isSpam = await this.antiSpamService.analyzeJobPost(jobForAnalysis);
      if (isSpam) {
        console.warn(`Potential spam job detected: ${saved.id}`);
        saved.isFlagged = true;
        await this.jobRepository.save(saved);
      }
    } catch (error) {
      console.error('Anti-spam analysis failed:', error);
    }

    return saved;
  }

  async findAllJobs(includeDeleted: boolean = false): Promise<Job[]> {
    const options: any = {
      order: { createdAt: 'DESC' },
    };

    if (includeDeleted) {
      options.withDeleted = true;
    }

    return this.jobRepository.find(options);
  }

  async findJobById(id: number, includeDeleted: boolean = false): Promise<Job> {
    const options: any = {
      where: { id },
    };

    if (includeDeleted) {
      options.withDeleted = true;
    }

    const job = await this.jobRepository.findOne(options);

    if (!job) {
      throw new NotFoundException(`Job with ID ${id} not found`);
    }

    return job;
  }

  async updateJob(
    id: number,
    updateJobDto: UpdateJobDto,
    userId: string,
  ): Promise<Job> {
    const job = await this.findJobById(id);

    // Check ownership using recruiterId
    if (job.recruiterId !== userId) {
      throw new ForbiddenException('Only the job owner can update this job');
    }

    Object.assign(job, updateJobDto);
    return this.jobRepository.save(job);
  }

  async removeJob(id: number, userId: string): Promise<{ message: string }> {
    const job = await this.findJobById(id);

    // Check ownership using recruiterId
    if (job.recruiterId !== userId) {
      throw new ForbiddenException('Only the job owner can delete this job');
    }

    // Soft delete the job using TypeORM's softDelete
    await this.jobRepository.softDelete(id);

    return { message: 'Job deleted successfully' };
  }

  async restoreJob(id: number, userId: string): Promise<{ message: string }> {
    const job = await this.jobRepository.findOne({
      where: { id },
      withDeleted: true,
    });

    if (!job) {
      throw new NotFoundException(`Job with ID ${id} not found`);
    }

    if (!job.deletedAt) {
      throw new BadRequestException('Job is not deleted');
    }

    // Check ownership using recruiterId
    if (job.recruiterId !== userId) {
      throw new ForbiddenException('Only the job owner can restore this job');
    }

    // Restore the job
    await this.jobRepository.restore(id);

    return { message: 'Job restored successfully' };
  }

  async createApplication(
    createApplicationDto: CreateApplicationDto,
  ): Promise<Application> {
    // Convert jobId to number if it's a string
    const jobId =
      typeof createApplicationDto.jobId === 'string'
        ? parseInt(createApplicationDto.jobId, 10)
        : createApplicationDto.jobId;

    const job = await this.jobRepository.findOne({
      where: { id: jobId },
    });
    if (!job) {
      throw new NotFoundException(
        `Job with ID ${createApplicationDto.jobId} not found`,
      );
    }

    // Check if job is accepting applications
    if (!job.isAcceptingApplications) {
      throw new ForbiddenException('This job is not accepting applications.');
    }

    const application = this.applicationRepository.create(createApplicationDto);
    const savedApplication = await this.applicationRepository.save(application);

    // Increment application count
    await this.jobRepository.increment({ id: jobId }, 'applicationCount', 1);

    return savedApplication;
  }

  async findApplicationById(id: number): Promise<Application> {
    const application = await this.applicationRepository.findOne({
      where: { id: id.toString() },
    });
    if (!application) {
      throw new NotFoundException(`Application with ID ${id} not found`);
    }
    return application;
  }

  async updateApplication(
    id: number,
    updateApplicationDto: UpdateApplicationDto,
  ): Promise<Application> {
    const application = await this.findApplicationById(id);
    Object.assign(application, updateApplicationDto);
    return this.applicationRepository.save(application);
  }

  async removeApplication(id: number): Promise<{ message: string }> {
    const result = await this.applicationRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Application with ID ${id} not found`);
    }
    return { message: 'Application removed successfully' };
  }

  // Weekly analytics for jobs
  async getWeeklyNewJobsCount(
    includeDeleted: boolean = false,
  ): Promise<Array<{ week: string; count: number }>> {
    const query = this.jobRepository
      .createQueryBuilder('job')
      .select(
        `TO_CHAR(DATE_TRUNC('week', job."createdAt"), 'YYYY-MM-DD')`,
        'week',
      )
      .addSelect('COUNT(*)', 'count')
      .groupBy('1')
      .orderBy('1', 'DESC');

    if (!includeDeleted) {
      query.andWhere('job.deletedAt IS NULL');
    }

    const raw = await query.getRawMany<{ week: string; count: string }>();

    return raw.map((r) => ({
      week: r.week,
      count: parseInt(r.count, 10),
    }));
  }

  async getWeeklyNewApplicationsCount(): Promise<
    Array<{ week: string; count: number }>
  > {
    const raw = await this.applicationRepository
      .createQueryBuilder('application')
      .select(
        `TO_CHAR(DATE_TRUNC('week', application."createdAt"), 'YYYY-MM-DD')`,
        'week',
      )
      .addSelect('COUNT(*)', 'count')
      .groupBy(`DATE_TRUNC('week', application."createdAt")`)
      .orderBy(`DATE_TRUNC('week', application."createdAt")`, 'DESC')
      .getRawMany<{ week: string; count: string }>();

    return raw.map((r) => ({
      week: r.week,
      count: parseInt(r.count, 10),
    }));
  }

  async updateJobStatus(
    id: number,
    updateStatusDto: UpdateJobStatusDto,
    userId: string,
  ): Promise<Job> {
    const job = await this.findJobById(id);

    // Check ownership using recruiterId
    if (job.recruiterId !== userId) {
      throw new ForbiddenException(
        'Only the job owner can update the job status',
      );
    }

    job.status = updateStatusDto.status;
    return this.jobRepository.save(job);
  }

  async toggleAcceptingApplications(
    jobId: number,
    isAccepting: boolean,
    userId: string,
  ): Promise<Job> {
    const job = await this.findJobById(jobId);

    // Check ownership using recruiterId
    if (job.recruiterId !== userId) {
      throw new ForbiddenException(
        'Only the job owner can update this setting',
      );
    }

    job.isAcceptingApplications = isAccepting;
    return this.jobRepository.save(job);
  }

  async toggleSaveJob(
    jobId: number,
    userId: string,
  ): Promise<{ saved: boolean }> {
    await this.findJobById(jobId); // Verify job exists

    const existingSavedJob = await this.savedJobRepository.findOne({
      where: {
        job: { id: jobId },
        user: { id: userId },
      },
      relations: ['job', 'user'],
    });

    if (existingSavedJob) {
      await this.savedJobRepository.remove(existingSavedJob);
      return { saved: false };
    }

    const savedJob = this.savedJobRepository.create({
      job: { id: jobId },
      user: { id: userId },
    });
    await this.savedJobRepository.save(savedJob);
    return { saved: true };
  }

  async getSavedJobs(userId: string): Promise<Job[]> {
    const savedJobs = await this.savedJobRepository.find({
      where: { user: { id: userId } },
      relations: ['job'],
      order: { savedAt: 'DESC' },
    });

    return savedJobs.map((savedJob) => savedJob.job);
  }

  async isJobSaved(jobId: number, userId: string): Promise<boolean> {
    const savedJob = await this.savedJobRepository.findOne({
      where: {
        job: { id: jobId },
        user: { id: userId },
      },
      relations: ['job', 'user'],
    });
    return !!savedJob;
  }

  // Job view tracking
  async incrementViewCount(jobId: number): Promise<void> {
    await this.jobRepository.increment({ id: jobId }, 'viewCount', 1);
  }

  // Paginated job list method
  async getPaginatedJobs(
    page?: number,
    limit?: number,
    sortBy?: string,
    filters?: {
      status?: JobStatus;
      jobType?: string;
      location?: string;
      isRemote?: boolean;
      salaryMin?: number;
      salaryMax?: number;
    },
  ): Promise<PaginatedJobResponseDto> {
    const safePage = Number(page) || 1;
    const safeLimit = Number(limit) || 10;
    const skip = (safePage - 1) * safeLimit;

    // Valid sort fields for the unified Job entity
    const validSortFields: (keyof Job)[] = [
      'createdAt',
      'title',
      'budget',
      'deadline',
      'status',
      'viewCount',
      'applicationCount',
      'salaryMin',
      'salaryMax',
    ];

    const query = this.jobRepository.createQueryBuilder('job');

    // Apply filters
    if (filters) {
      if (filters.status) {
        query.andWhere('job.status = :status', { status: filters.status });
      }
      if (filters.jobType) {
        query.andWhere('job.jobType = :jobType', { jobType: filters.jobType });
      }
      if (filters.location) {
        query.andWhere('job.location ILIKE :location', {
          location: `%${filters.location}%`,
        });
      }
      if (filters.isRemote !== undefined) {
        query.andWhere('job.isRemote = :isRemote', {
          isRemote: filters.isRemote,
        });
      }
      if (filters.salaryMin) {
        query.andWhere('job.salaryMin >= :salaryMin', {
          salaryMin: filters.salaryMin,
        });
      }
      if (filters.salaryMax) {
        query.andWhere('job.salaryMax <= :salaryMax', {
          salaryMax: filters.salaryMax,
        });
      }
    }

    // Apply sorting
    if (sortBy && validSortFields.includes(sortBy as keyof Job)) {
      query.orderBy(`job.${sortBy}`, 'DESC');
    } else {
      query.orderBy('job.createdAt', 'DESC');
    }

    const [jobs, total] = await query
      .skip(skip)
      .take(safeLimit)
      .getManyAndCount();

    // Use adapter to convert to expected format if needed
    const convertedJobs = JobAdapter.toJobPostingEntities(jobs);

    return new PaginatedJobResponseDto(
      convertedJobs,
      total,
      safePage,
      safeLimit,
    );
  }

  async getSingleJobAsDto(id: number): Promise<JobResponseDto> {
    const job = await this.findJobById(id);

    // Increment view count
    await this.incrementViewCount(id);

    // Use adapter to convert to expected format
    const convertedJob = JobAdapter.toJobPostingEntity(job);

    return new JobResponseDto(convertedJob);
  }

  // Template methods remain the same
  async createTemplate(
    createTemplateDto: CreateTemplateDto,
  ): Promise<JobTemplate> {
    const template = this.templateRepository.create(createTemplateDto);
    return await this.templateRepository.save(template);
  }

  async findAllTemplates(
    userId: string,
    category?: string,
    tags?: string[],
    includeShared = true,
  ): Promise<JobTemplate[]> {
    const query = this.templateRepository.createQueryBuilder('template');

    if (includeShared) {
      query.where(
        'template.createdBy = :userId OR template.isShared = :isShared',
        { userId, isShared: true },
      );
    } else {
      query.where('template.createdBy = :userId', { userId });
    }

    if (category) {
      query.andWhere('template.category = :category', { category });
    }

    if (tags && tags.length > 0) {
      query.andWhere('template.tags && :tags', { tags });
    }

    query
      .orderBy('template.lastUsedAt', 'DESC', 'NULLS LAST')
      .addOrderBy('template.createdAt', 'DESC');

    return await query.getMany();
  }

  async findTemplateById(id: string, userId: string): Promise<JobTemplate> {
    const template = await this.templateRepository.findOne({
      where: { id },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    if (template.createdBy !== userId && !template.isShared) {
      throw new NotFoundException('Template not found or access denied');
    }

    return template;
  }

  async updateTemplate(
    id: string,
    updateTemplateDto: UpdateTemplateDto,
    userId: string,
  ): Promise<JobTemplate> {
    const template = await this.findTemplateById(id, userId);

    if (template.createdBy !== userId) {
      throw new BadRequestException('Only the template creator can update it');
    }

    Object.assign(template, updateTemplateDto);
    return await this.templateRepository.save(template);
  }

  async deleteTemplate(id: string, userId: string): Promise<void> {
    const template = await this.findTemplateById(id, userId);

    if (template.createdBy !== userId) {
      throw new BadRequestException('Only the template creator can delete it');
    }

    await this.templateRepository.remove(template);
  }

  async getTemplateCategories(userId: string): Promise<string[]> {
    const result = await this.templateRepository
      .createQueryBuilder('template')
      .select('DISTINCT template.category', 'category')
      .where('template.createdBy = :userId OR template.isShared = true', {
        userId,
      })
      .andWhere('template.category IS NOT NULL')
      .getRawMany();

    return result.map((r) => r.category).filter(Boolean);
  }

  async getTemplateTags(userId: string): Promise<string[]> {
    const templates = await this.templateRepository.find({
      where: [{ createdBy: userId }, { isShared: true }],
      select: ['tags'],
    });

    const allTags = templates.flatMap((t) => t.tags || []);
    return [...new Set(allTags)].sort();
  }

  async createJobFromTemplate(
    createJobFromTemplateDto: CreateJobFromTemplateDto,
    userId: string,
  ): Promise<Job> {
    const { templateId, ...overrides } = createJobFromTemplateDto;

    const template = await this.findTemplateById(templateId, userId);

    // Create job from template with overrides
    const jobData: Partial<Job> = {
      title: overrides.title || template.title,
      description: overrides.description || template.jobDescription,
      company: template.company,
      location: overrides.location || template.location,
      jobType: template.jobType,
      experienceLevel: template.experienceLevel,
      salaryMin: template.salaryMin,
      salaryMax: template.salaryMax,
      salaryCurrency: template.salaryCurrency,
      requirements: template.requirements || [],
      responsibilities: template.responsibilities || [],
      benefits: template.benefits || [],
      skills: template.skills || [],
      contactEmail: overrides.contactEmail || template.contactEmail,
      contactPhone: overrides.contactPhone || template.contactPhone,
      applicationDeadline: overrides.applicationDeadline,
      isUrgent: overrides.isUrgent || false,
      isFeatured: overrides.isFeatured || false,
      status: JobStatus.DRAFT,
      recruiterId: userId,
      ownerId: userId,
      // Set default values for required fields
      viewCount: 0,
      applicationCount: 0,
      completionStatus: CompletionStatus.NOT_SUBMITTED,
      paymentReleased: false,
      isAcceptingApplications: true,
      isRemote: template.isRemote || false,
      // isUrgent: false,
      // isFeatured: false,
      isFlagged: false,
    };

    const job = this.jobRepository.create(jobData);
    const savedJob = await this.jobRepository.save(job);

    // Update template usage statistics
    await this.updateTemplateUsage(templateId);

    return savedJob;
  }

  private async updateTemplateUsage(templateId: string): Promise<void> {
    await this.templateRepository.update(templateId, {
      useCount: () => 'use_count + 1',
      lastUsedAt: new Date(),
    });
  }

  async shareTemplate(
    templateId: string,
    userId: string,
  ): Promise<JobTemplate> {
    const template = await this.findTemplateById(templateId, userId);

    if (template.createdBy !== userId) {
      throw new BadRequestException('Only the template creator can share it');
    }

    template.isShared = true;
    return await this.templateRepository.save(template);
  }

  async unshareTemplate(
    templateId: string,
    userId: string,
  ): Promise<JobTemplate> {
    const template = await this.findTemplateById(templateId, userId);

    if (template.createdBy !== userId) {
      throw new BadRequestException('Only the template creator can unshare it');
    }

    template.isShared = false;
    return await this.templateRepository.save(template);
  }

  async getTemplateStats(userId: string): Promise<any> {
    const stats = await this.templateRepository
      .createQueryBuilder('template')
      .select([
        'COUNT(*) as total_templates',
        'COUNT(CASE WHEN template.isShared = true THEN 1 END) as shared_templates',
        'SUM(template.useCount) as total_uses',
        'AVG(template.useCount) as avg_uses_per_template',
      ])
      .where('template.createdBy = :userId', { userId })
      .getRawOne();

    const mostUsedTemplates = await this.templateRepository.find({
      where: { createdBy: userId },
      order: { useCount: 'DESC', lastUsedAt: 'DESC' },
      take: 5,
      select: ['id', 'name', 'useCount', 'lastUsedAt'],
    });

    return {
      ...stats,
      most_used_templates: mostUsedTemplates,
    };
  }

  // Additional utility methods for the unified entity
  async getJobsByStatus(status: JobStatus, userId?: string): Promise<Job[]> {
    const query = this.jobRepository
      .createQueryBuilder('job')
      .where('job.status = :status', { status });

    if (userId) {
      query.andWhere('job.recruiterId = :userId', { userId });
    }

    return await query.getMany();
  }

  async getJobsByExperienceLevel(
    experienceLevel: string,
    limit = 10,
  ): Promise<Job[]> {
    return await this.jobRepository.find({
      where: { experienceLevel: experienceLevel as any },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async getFeaturedJobs(limit = 5): Promise<Job[]> {
    return await this.jobRepository.find({
      where: { isFeatured: true, status: JobStatus.ACTIVE },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async getUrgentJobs(limit = 10): Promise<Job[]> {
    return await this.jobRepository.find({
      where: { isUrgent: true, status: JobStatus.ACTIVE },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }
}
