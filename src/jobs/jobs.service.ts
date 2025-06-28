import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, IsNull, DataSource } from 'typeorm';

import { Job } from './entities/job.entity';
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
// import { JobAdapter } from './adapters/job.adapter'; // Uncomment if you create the adapter

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
      // Anti-spam analysis with local entity structure
      const jobForAnalysis = {
        ...saved,
        isFlagged: false,
        main: saved.description || '',
        isAcceptingApplications: saved.isAcceptingApplications,
        applications: [],
        ownerId: saved.ownerId || 0,
        recruiter: null,
        recruiterId: saved.recruiterId || '',
        freelancerts: [],
      } as any;

      const isSpam = await this.antiSpamService.analyzeJobPost(jobForAnalysis);
      if (isSpam) {
        // Handle spam detection
        console.warn(`Potential spam job detected: ${saved.id}`);
        // You might want to update the job status or flag it for review
        // saved.status = 'pending_review' as any;
        // await this.jobRepository.save(saved);
      }
    } catch (error) {
      console.error('Anti-spam analysis failed:', error);
    }

    return saved;
  }

  async findAllJobs(includeDeleted: boolean = false): Promise<Job[]> {
    const query = this.jobRepository
      .createQueryBuilder('job')
      .orderBy('job.createdAt', 'DESC');

    if (!includeDeleted) {
      query.andWhere('job.deletedAt IS NULL');
    }

    return query.getMany();
  }

  async findJobById(id: number): Promise<Job> {
    const job = await this.jobRepository.findOne({ where: { id } });
    if (!job) {
      throw new NotFoundException(`Job with ID ${id} not found`);
    }

    return job;
  }

  async updateJob(
    id: number,
    updateJobDto: UpdateJobDto,
    userId: number,
  ): Promise<Job> {
    const job = await this.findJobById(id);

    // Check if the user is the owner of the job
    if (job.ownerId !== userId) {
      throw new ForbiddenException('Only the job owner can update this job');
    }

    Object.assign(job, updateJobDto);
    return this.jobRepository.save(job);
  }

  async removeJob(id: number, userId: number): Promise<{ message: string }> {
    const job = await this.findJobById(id);
    // Check if the user is the owner of the job
    if (job.ownerId !== userId) {
      throw new ForbiddenException('Only the job owner can delete this job');
    }

    // Soft delete the job using TypeORM's softDelete
    await this.jobRepository.softDelete(id);

    return { message: 'Job deleted successfully' };
  }

  async restoreJob(id: number, userId: number): Promise<{ message: string }> {
    const job = await this.jobRepository.findOne({
      where: { id },
      withDeleted: true,
    });

    if (!job) {
      throw new NotFoundException(`Job with ID ${id} not found`);
    }

    if (!job.deletedAt) {
      throw new NotFoundException('Job is not deleted');
    }

    // Check if the user is the owner of the job
    if (job.ownerId !== userId) {
      throw new ForbiddenException('Only the job owner can restore this job');
    }

    // Restore the job
    await this.jobRepository.restore(id);

    return { message: 'Job restored successfully' };
  }

  async createApplication(
    createApplicationDto: CreateApplicationDto,
  ): Promise<Application> {
    const job = await this.jobRepository.findOne({
      where: { id: parseInt(createApplicationDto.jobId) },
    });
    if (!job) {
      throw new NotFoundException(
        `Job with ID ${createApplicationDto.jobId} not found`,
      );
    }
    // Check if the job is accepting applications
    if (!job.isAcceptingApplications) {
      throw new ForbiddenException('This job is not accepting applications.');
    }

    const application = this.applicationRepository.create(createApplicationDto);
    return this.applicationRepository.save(application);
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
    userId: number,
  ): Promise<Job> {
    const job = await this.findJobById(id);
    // Check if the user is the owner of the job
    if (job.ownerId !== userId) {
      throw new ForbiddenException(
        'Only the job owner can update the job status',
      );
    }

    // Update the job status
    job.status = updateStatusDto.status;
    return this.jobRepository.save(job);
  }

  async toggleAcceptingApplications(
    jobId: number,
    isAccepting: boolean,
    userId: number,
  ): Promise<Job> {
    const job = await this.findJobById(jobId);
    // Check if the user is the owner of the job
    if (job.ownerId !== userId) {
      throw new ForbiddenException(
        'Only the job owner can update this setting',
      );
    }

    // Update the accepting applications setting
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
        job: { id: jobId } as any,
        user: { id: userId } as any,
      },
      relations: ['job', 'user'],
    });

    if (existingSavedJob) {
      await this.savedJobRepository.remove(existingSavedJob);
      return { saved: false };
    }

    const savedJob = this.savedJobRepository.create({
      job: { id: jobId } as any,
      user: { id: userId } as any,
    });
    await this.savedJobRepository.save(savedJob);
    return { saved: true };
  }

  async getSavedJobs(userId: string): Promise<Job[]> {
    const savedJobs = await this.savedJobRepository.find({
      where: { user: { id: userId } as any },
      relations: ['job'],
      order: { savedAt: 'DESC' },
    });

    // Convert SavedJob.job (jobs entity) to Job (job-posting entity)
    return savedJobs.map((savedJob) => savedJob.job as unknown as Job);
  }

  async isJobSaved(jobId: string, userId: string): Promise<boolean> {
    const savedJob = await this.savedJobRepository.findOne({
      where: {
        job: { id: jobId } as any,
        user: { id: userId } as any,
      },
      relations: ['job', 'user'],
    });
    return !!savedJob;
  }

  // Fixed paginated job list method
  async getPaginatedJobs(
    page?: number,
    limit?: number,
    sortBy?: string,
  ): Promise<PaginatedJobResponseDto> {
    const safePage = Number(page) || 1;
    const safeLimit = Number(limit) || 10;
    const skip = (safePage - 1) * safeLimit;

    const validSortFields: (keyof Job)[] = [
      'createdAt',
      'title',
      'status',
      'budget',
    ];
    const query = this.jobRepository.createQueryBuilder('job');

    // Fixed: Check if sortBy exists and is valid before using it
    if (sortBy && validSortFields.includes(sortBy as keyof Job)) {
      query.orderBy(`job.${sortBy}`, 'DESC');
    } else {
      // Default sort by createdAt if no valid sortBy provided
      query.orderBy('job.createdAt', 'DESC');
    }

    const [jobs, total] = await query
      .skip(skip)
      .take(safeLimit)
      .getManyAndCount();

    // Convert local Job entities to job-posting Job entities for DTO compatibility
    const convertedJobs = jobs.map(
      (job) =>
        ({
          id: job.id.toString(),
          title: job.title,
          description: job.description,
          company: 'Unknown', // Local entity doesn't have company
          location: 'Unknown', // Local entity doesn't have location
          jobType: 'full_time' as any,
          status: job.status as any,
          experienceLevel: 'mid' as any,
          salaryMin: job.budget || 0,
          salaryMax: job.budget || 0,
          salaryCurrency: 'USD',
          requirements: [],
          responsibilities: [],
          benefits: [],
          skills: [],
          contactEmail: '',
          contactPhone: '',
          applicationDeadline: job.deadline,
          isRemote: job.isRemote,
          isUrgent: false,
          isFeatured: false,
          viewCount: 0,
          applicationCount: 0,
          createdAt: job.createdAt,
          updatedAt: job.updatedAt,
        }) as any,
    );

    // Fixed: Use safePage and safeLimit instead of potentially undefined values
    return new PaginatedJobResponseDto(
      convertedJobs,
      total,
      safePage,
      safeLimit,
    );
  }

  async getSingleJobAsDto(id: number): Promise<JobResponseDto> {
    const job = await this.findJobById(id);
    // Convert local Job entity to job-posting Job entity for DTO compatibility
    const convertedJob = {
      id: job.id.toString(),
      title: job.title,
      description: job.description,
      company: 'Unknown',
      location: 'Unknown',
      jobType: 'full_time' as any,
      status: job.status as any,
      experienceLevel: 'mid' as any,
      salaryMin: job.budget || 0,
      salaryMax: job.budget || 0,
      salaryCurrency: 'USD',
      requirements: [],
      responsibilities: [],
      benefits: [],
      skills: [],
      contactEmail: '',
      contactPhone: '',
      applicationDeadline: job.deadline,
      isRemote: job.isRemote,
      isUrgent: false,
      isFeatured: false,
      viewCount: 0,
      applicationCount: 0,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    } as any;
    return new JobResponseDto(convertedJob);
  }
}
