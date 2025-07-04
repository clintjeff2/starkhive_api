import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Brackets } from 'typeorm';
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
import { SearchJobsDto, JobSortBy } from './dto/search-jobs.dto';
import { JobTemplate } from './entities/job-template.entity';
import {
  CreateJobFromTemplateDto,
  CreateTemplateDto,
  UpdateTemplateDto,
} from './dto/job-template.dto';
import { Job, CompletionStatus, ExperienceLevel } from './entities/job.entity';
import { BlockchainService } from './blockchain/blockchain.service';
import { CurrencyConversionService } from './services/currency-conversion.service';
import { User } from '../auth/entities/user.entity';
import { JobStatus } from 'src/feed/enums/job-status.enum';

@Injectable()
export class JobsService {
  constructor(
    @InjectRepository(Job)
    private readonly jobRepository: Repository<Job>,

    @InjectRepository(Application)
    private readonly applicationRepository: Repository<Application>,

    @InjectRepository(SavedJob)
    private readonly savedJobRepository: Repository<SavedJob>,

    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    private readonly antiSpamService: AntiSpamService,

    @InjectRepository(JobTemplate)
    private readonly templateRepository: Repository<JobTemplate>,

    @Inject(DataSource)
    private readonly dataSource: DataSource,

    private readonly blockchainService: BlockchainService,
    private readonly currencyConversionService: CurrencyConversionService,
  ) {}

  async createJob(createJobDto: CreateJobDto): Promise<Job> {
    if (
      createJobDto.currency &&
      createJobDto.budget &&
      createJobDto.recruiterId
    ) {
      const recruiterRaw = await this.userRepository.findOne({
        where: { id: createJobDto.recruiterId as string },
      });
      if (!recruiterRaw) {
        throw new BadRequestException('Recruiter wallet address not found.');
      }
      const balance = await this.blockchainService.getTokenBalance(
        recruiterRaw.walletAddress!,
        createJobDto.currency,
      );
      if (balance < createJobDto.budget) {
        throw new BadRequestException(
          `Insufficient ${createJobDto.currency} balance to post this job. Required: ${createJobDto.budget}, Available: ${balance}`,
        );
      }
    }
    const job = this.jobRepository.create(createJobDto);
    const saved = await this.jobRepository.save(job);

    try {
      const jobForAnalysis = {
        ...saved,
        main: saved.description || '',
        isAcceptingApplications: saved.isAcceptingApplications,
        applications: [],
        recruiter: null,
        recruiterId: saved.recruiterId,
        freelancerts: [],
      } as unknown as Job;

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

  async findAllJobs(includeDeleted = false): Promise<Job[]> {
    const options: { order: { createdAt: 'DESC' }; withDeleted?: boolean } = {
      order: { createdAt: 'DESC' },
    };
    if (includeDeleted) options.withDeleted = true;
    return this.jobRepository.find(options);
  }

  async findJobById(id: number, includeDeleted = false): Promise<Job> {
    const options: { where: { id: number }; withDeleted?: boolean } = {
      where: { id },
    };
    if (includeDeleted) options.withDeleted = true;
    const job = await this.jobRepository.findOne(options);
    if (!job) throw new NotFoundException(`Job with ID ${id} not found`);
    return job;
  }

  async updateJob(id: number, dto: UpdateJobDto, userId: string): Promise<Job> {
    const job = await this.findJobById(id);
    if (String(job.recruiterId) !== String(userId)) {
      throw new ForbiddenException('Only the job owner can update this job');
    }
    Object.assign(job, dto);
    return this.jobRepository.save(job);
  }

  async removeJob(id: number, userId: string): Promise<{ message: string }> {
    const job = await this.findJobById(id);
    if (String(job.recruiterId) !== String(userId))
      throw new ForbiddenException('Only the job owner can delete this job');
    await this.jobRepository.softDelete(id);
    return { message: 'Job deleted successfully' };
  }

  async restoreJob(id: number, userId: string): Promise<{ message: string }> {
    const job = await this.findJobById(id, true);
    if (!job.deletedAt) throw new BadRequestException('Job is not deleted');
    if (String(job.recruiterId) !== String(userId))
      throw new ForbiddenException('Only the job owner can restore this job');
    await this.jobRepository.restore(id);
    return { message: 'Job restored successfully' };
  }

  async createApplication(
    createApplicationDto: CreateApplicationDto,
  ): Promise<Application> {
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

    if (!job.isAcceptingApplications) {
      throw new ForbiddenException('This job is not accepting applications.');
    }

    const application = this.applicationRepository.create(createApplicationDto);
    const savedApplication = await this.applicationRepository.save(application);

    await this.jobRepository.increment({ id: jobId }, 'applicationCount', 1);

    return savedApplication;
  }

  async findApplicationById(id: number): Promise<Application> {
    const application = await this.applicationRepository.findOne({
      where: { id: String(id) },
    });
    if (!application) {
      throw new NotFoundException(`Application with ID ${id} not found`);
    }
    return application;
  }

  async updateApplication(
    id: number,
    dto: UpdateApplicationDto,
  ): Promise<Application> {
    const application = await this.findApplicationById(id);
    Object.assign(application, dto);
    return this.applicationRepository.save(application);
  }

  async removeApplication(id: number): Promise<{ message: string }> {
    const result = await this.applicationRepository.delete(id);
    if (result.affected === 0)
      throw new NotFoundException(`Application with ID ${id} not found`);
    return { message: 'Application removed successfully' };
  }

  async updateJobStatus(
    id: number,
    dto: UpdateJobStatusDto,
    userId: string,
  ): Promise<Job> {
    const job = await this.findJobById(id);

    if (String(job.recruiterId) !== String(userId)) {
      throw new ForbiddenException(
        'Only the job owner can update the job status',
      );
    }

    job.status = dto.status;
    return this.jobRepository.save(job);
  }

  async toggleAcceptingApplications(
    jobId: number,
    isAccepting: boolean,
    userId: string,
  ): Promise<Job> {
    const job = await this.findJobById(jobId);

    if (String(job.recruiterId) !== String(userId)) {
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
    await this.findJobById(jobId);
    const existing = await this.savedJobRepository.findOne({
      where: { job: { id: jobId }, user: { id: userId } },
      relations: ['job', 'user'],
    });
    if (existing) {
      await this.savedJobRepository.remove(existing);
      return { saved: false };
    }
    const saved = this.savedJobRepository.create({
      job: { id: jobId },
      user: { id: userId },
    });
    await this.savedJobRepository.save(saved);
    return { saved: true };
  }

  async getSavedJobs(userId: string): Promise<Job[]> {
    const saved = await this.savedJobRepository.find({
      where: { user: { id: userId } },
      relations: ['job'],
      order: { savedAt: 'DESC' },
    });
    return saved.map((s) => s.job);
  }

  async isJobSaved(jobId: number, userId: string): Promise<boolean> {
    const saved = await this.savedJobRepository.findOne({
      where: { job: { id: jobId }, user: { id: userId } },
      relations: ['job', 'user'],
    });
    return !!saved;
  }

  async incrementViewCount(jobId: number): Promise<void> {
    await this.jobRepository.increment({ id: jobId }, 'viewCount', 1);
  }

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
      if (typeof filters.salaryMin === 'number') {
        query.andWhere('job.salaryMin >= :salaryMin', {
          salaryMin: filters.salaryMin,
        });
      }
      if (typeof filters.salaryMax === 'number') {
        query.andWhere('job.salaryMax <= :salaryMax', {
          salaryMax: filters.salaryMax,
        });
      }
    }

    if (sortBy && validSortFields.includes(sortBy as keyof Job)) {
      query.orderBy(`job.${sortBy}`, 'DESC');
    } else {
      query.orderBy('job.createdAt', 'DESC');
    }

    const [jobs, total] = await query
      .skip(skip)
      .take(safeLimit)
      .getManyAndCount();

    return new PaginatedJobResponseDto(jobs, total, safePage, safeLimit);
  }

  async getSingleJobAsDto(id: number): Promise<JobResponseDto> {
    const job = await this.findJobById(id);
    return new JobResponseDto(job);
  }

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

    return (result as { category: string }[])
      .map((r) => r.category)
      .filter(Boolean);
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
      isUrgent: overrides.isUrgent ?? false,
      isFeatured: overrides.isFeatured ?? false,
      status: JobStatus.CLOSED,
      recruiterId: userId,
      ownerId: userId,
      viewCount: 0,
      applicationCount: 0,
      completionStatus: CompletionStatus.NOT_SUBMITTED,
      paymentReleased: false,
      isAcceptingApplications: true,
      isRemote: template.isRemote ?? false,
      isFlagged: false,
    };

    const job = this.jobRepository.create(jobData);
    const savedJob = await this.jobRepository.save(job);

    await this.updateTemplateUsage(templateId);

    return savedJob;
  }

  private async updateTemplateUsage(templateId: string): Promise<void> {
    await this.templateRepository
      .createQueryBuilder()
      .update(JobTemplate)
      .set({
        useCount: () => '"useCount" + 1',
        lastUsedAt: new Date(),
      })
      .where('id = :templateId', { templateId })
      .execute();
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
    const stats = (await this.templateRepository
      .createQueryBuilder('template')
      .select([
        'COUNT(*) as total_templates',
        'COUNT(CASE WHEN template.isShared = true THEN 1 END) as shared_templates',
        'SUM(template.useCount) as total_uses',
        'AVG(template.useCount) as avg_uses_per_template',
      ])
      .where('template.createdBy = :userId', { userId })
      .getRawOne()) as {
      total_templates: number;
      shared_templates: number;
      total_uses: number;
      avg_uses_per_template: number;
    };

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
      where: { experienceLevel: experienceLevel as ExperienceLevel },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async getFeaturedJobs(limit = 5): Promise<Job[]> {
    return await this.jobRepository.find({
      where: { isFeatured: true, status: JobStatus.OPEN },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async getUrgentJobs(limit = 10): Promise<Job[]> {
    return await this.jobRepository.find({
      where: { isUrgent: true, status: JobStatus.OPEN },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async advancedSearchJobs(
    dto: SearchJobsDto,
  ): Promise<PaginatedJobResponseDto> {
    const {
      q,
      minBudget,
      maxBudget,
      deadlineFrom,
      deadlineTo,
      location,
      jobType,
      status,
      experienceLevel,
      sortBy = JobSortBy.DATE,
      page = 1,
      limit = 10,
    } = dto;
    const skip = (page - 1) * limit;
    const query = this.jobRepository.createQueryBuilder('job');
    if (!status) {
      query.andWhere('job.status = :active', { active: 'active' });
    } else {
      query.andWhere('job.status = :status', { status });
    }
    if (q) {
      query.andWhere(
        new Brackets((qb) => {
          qb.where('job.title ILIKE :q', { q: `%${q}%` }).orWhere(
            'job.description ILIKE :q',
            { q: `%${q}%` },
          );
        }),
      );
    }
    if (typeof minBudget === 'number') {
      query.andWhere('(job.budget IS NULL OR job.budget >= :minBudget)', {
        minBudget,
      });
    }
    if (typeof maxBudget === 'number') {
      query.andWhere('(job.budget IS NULL OR job.budget <= :maxBudget)', {
        maxBudget,
      });
    }
    if (deadlineFrom) {
      query.andWhere(
        '(job.deadline IS NULL OR job.deadline >= :deadlineFrom)',
        { deadlineFrom },
      );
    }
    if (deadlineTo) {
      query.andWhere('(job.deadline IS NULL OR job.deadline <= :deadlineTo)', {
        deadlineTo,
      });
    }
    if (location) {
      query.andWhere('job.location ILIKE :location', {
        location: `%${location}%`,
      });
    }
    if (jobType) {
      query.andWhere('job.jobType = :jobType', { jobType });
    }
    if (experienceLevel) {
      query.andWhere('job.experienceLevel = :experienceLevel', {
        experienceLevel,
      });
    }
    // Skills filter omitted unless present in entity
    if (sortBy === JobSortBy.BUDGET) {
      query.orderBy('job.budget', 'DESC');
    } else if (sortBy === JobSortBy.RELEVANCE && q) {
      query
        .addSelect(
          `ts_rank(to_tsvector('english', job.title || ' ' || job.description), plainto_tsquery('english', :q))`,
          'relevance',
        )
        .orderBy('relevance', 'DESC');
    } else {
      query.orderBy('job.createdAt', 'DESC');
    }
    query.skip(skip).take(limit);
    const [jobs, total] = await query.getManyAndCount();
    return new PaginatedJobResponseDto(jobs, total, page, limit);
  }
}
