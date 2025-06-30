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
import { SearchJobsDto, JobSortBy } from './dto/search-jobs.dto';
import { Job } from './entities/job.entity';
import { JobAdapter } from './adapters/job.adapter';

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
        // You might want to update the job status or flag it for review
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

    // Check ownership using recruiterId (the actual owner field in your entity)
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

    // Check if job is accepting applications using the correct property
    if (!job.isAcceptingApplications) {
      throw new ForbiddenException('This job is not accepting applications.');
    }

    const application = this.applicationRepository.create(createApplicationDto);
    return this.applicationRepository.save(application);
  }

  async findApplicationById(id: number): Promise<Application> {
    // Handle both string and number IDs for Application entity
    const application = await this.applicationRepository.findOne({
      where: { id: id.toString() }, // Convert to string if Application uses string IDs
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

    // Update status using the JobStatus enum from your entity
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

    // Use the correct property from your Job entity
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

  // Fixed paginated job list method using adapter
  async getPaginatedJobs(
    page?: number,
    limit?: number,
    sortBy?: string,
  ): Promise<PaginatedJobResponseDto> {
    const safePage = Number(page) || 1;
    const safeLimit = Number(limit) || 10;
    const skip = (safePage - 1) * safeLimit;

    // Updated valid sort fields to match your Job entity
    const validSortFields: (keyof Job)[] = [
      'createdAt',
      'title',
      'budget',
      'deadline',
      'status',
    ];

    const query = this.jobRepository.createQueryBuilder('job');

    if (sortBy && validSortFields.includes(sortBy as keyof Job)) {
      query.orderBy(`job.${sortBy}`, 'DESC');
    } else {
      query.orderBy('job.createdAt', 'DESC');
    }

    const [jobs, total] = await query
      .skip(skip)
      .take(safeLimit)
      .getManyAndCount();

    // Use adapter to convert to expected format
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

    // Use adapter to convert to expected format
    const convertedJob = JobAdapter.toJobPostingEntity(job);

    return new JobResponseDto(convertedJob);
  }

  /**
   * Advanced job search with full-text, filtering, sorting, and pagination
   */
  async advancedSearchJobs(dto: SearchJobsDto): Promise<PaginatedJobResponseDto> {
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
      skills,
      sortBy = JobSortBy.DATE,
      page = 1,
      limit = 10,
    } = dto;
    const skip = (page - 1) * limit;

    const query = this.jobRepository.createQueryBuilder('job');

    // Only active jobs by default
    if (!status) {
      query.andWhere('job.status = :active', { active: 'active' });
    } else {
      query.andWhere('job.status = :status', { status });
    }

    // Full-text search (title, description, skills)
    if (q) {
      query.andWhere(
        new Brackets((qb) => {
          qb.where('job.title ILIKE :q', { q: `%${q}%` })
            .orWhere('job.description ILIKE :q', { q: `%${q}%` })
            .orWhere(`:q = ANY(job.skills)`, { q });
        })
      );
    }

    // Budget filtering
    if (minBudget !== undefined) {
      query.andWhere('(job.salaryMin IS NULL OR job.salaryMin >= :minBudget)', { minBudget });
    }
    if (maxBudget !== undefined) {
      query.andWhere('(job.salaryMax IS NULL OR job.salaryMax <= :maxBudget)', { maxBudget });
    }

    // Deadline filtering
    if (deadlineFrom) {
      query.andWhere('(job.applicationDeadline IS NULL OR job.applicationDeadline >= :deadlineFrom)', { deadlineFrom });
    }
    if (deadlineTo) {
      query.andWhere('(job.applicationDeadline IS NULL OR job.applicationDeadline <= :deadlineTo)', { deadlineTo });
    }

    // Location filtering (partial match)
    if (location) {
      query.andWhere('job.location ILIKE :location', { location: `%${location}%` });
    }

    // Job type, experience, skills
    if (jobType) {
      query.andWhere('job.jobType = :jobType', { jobType });
    }
    if (experienceLevel) {
      query.andWhere('job.experienceLevel = :experienceLevel', { experienceLevel });
    }
    if (skills && skills.length > 0) {
      for (const skill of skills) {
        query.andWhere(`:skill = ANY(job.skills)`, { skill });
      }
    }

    // Sorting
    if (sortBy === JobSortBy.BUDGET) {
      query.orderBy('job.salaryMax', 'DESC');
    } else if (sortBy === JobSortBy.RELEVANCE && q) {
      // For now, fallback to title match; for real relevance, use Postgres full-text search
      query.orderBy('job.title', 'DESC');
    } else {
      query.orderBy('job.createdAt', 'DESC');
    }

    // Pagination
    query.skip(skip).take(limit);

    // Select only needed fields (optional for optimization)
    // query.select(['job.id', 'job.title', ...]);

    const [jobs, total] = await query.getManyAndCount();
    return new PaginatedJobResponseDto(jobs, total, page, limit);
  }
}

