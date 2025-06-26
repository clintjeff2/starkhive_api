import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Job } from 'src/job-posting/entities/job.entity';
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
  ) {}

  async createJob(createJobDto: CreateJobDto): Promise<Job> {
    const job = this.jobRepository.create(createJobDto);
    const saved = await this.jobRepository.save(job);

    try {
      // Option 1: Using the adapter (if you create it)
      // const jobForAnalysis = JobAdapter.toJobsEntity(saved);

      // Option 2: Inline mapping (current approach)
      const jobForAnalysis = {
        ...saved,
        isFlagged: false,
        main: saved.description || '',
        isAcceptingApplications: saved.status === 'active',
        applications: [],
        ownerId: saved.contactEmail || '',
        recruiter: null,
        recruiterId: saved.contactEmail || '',
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

  async findAllJobs(): Promise<Job[]> {
    return this.jobRepository.find({ order: { createdAt: 'DESC' } });
  }

  async findJobById(id: string): Promise<Job> {
    const job = await this.jobRepository.findOne({ where: { id } });
    if (!job) {
      throw new NotFoundException(`Job with ID ${id} not found`);
    }
    return job;
  }

  async updateJob(
    id: string,
    updateJobDto: UpdateJobDto,
    userId: string,
  ): Promise<Job> {
    const job = await this.findJobById(id);

    // Note: You'll need to check which field represents the owner in the job-posting entity
    // The second entity doesn't have ownerId, so you might need recruiterId or another field
    if (job.contactEmail !== userId) {
      // Adjust this condition based on your auth logic
      throw new ForbiddenException('Only the job owner can update this job');
    }

    Object.assign(job, updateJobDto);
    return this.jobRepository.save(job);
  }

  async removeJob(id: string): Promise<{ message: string }> {
    const result = await this.jobRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Job with ID ${id} not found`);
    }
    return { message: 'Job removed successfully' };
  }

  async createApplication(
    createApplicationDto: CreateApplicationDto,
  ): Promise<Application> {
    const job = await this.jobRepository.findOne({
      where: { id: createApplicationDto.jobId },
    });
    if (!job) {
      throw new NotFoundException(
        `Job with ID ${createApplicationDto.jobId} not found`,
      );
    }
    // Note: The job-posting entity doesn't have isAcceptingApplications
    // You might need to check job.status instead
    if (job.status !== 'active') {
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

  async getWeeklyNewJobsCount(): Promise<
    Array<{ week: string; count: number }>
  > {
    const raw = await this.jobRepository
      .createQueryBuilder('job')
      .select(
        `TO_CHAR(DATE_TRUNC('week', job."createdAt"), 'YYYY-MM-DD')`,
        'week',
      )
      .addSelect('COUNT(*)', 'count')
      .groupBy(`DATE_TRUNC('week', job."createdAt")`)
      .orderBy(`DATE_TRUNC('week', job."createdAt")`, 'DESC')
      .getRawMany<{ week: string; count: string }>();

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
    id: string,
    updateStatusDto: UpdateJobStatusDto,
    userId: string,
  ): Promise<Job> {
    const job = await this.findJobById(id);
    // Note: Adjust this condition based on your ownership logic for the job-posting entity
    if (job.contactEmail !== userId) {
      throw new ForbiddenException(
        'Only the job owner can update the job status',
      );
    }

    // Map the status to match the Job entity's JobStatus enum
    // You'll need to adjust this based on your actual JobStatus enum
    job.status = updateStatusDto.status as any; // Type assertion for now
    return this.jobRepository.save(job);
  }

  async toggleAcceptingApplications(
    jobId: string,
    isAccepting: boolean,
    userId: string,
  ): Promise<Job> {
    const job = await this.findJobById(jobId);
    // Note: Adjust this condition based on your ownership logic
    if (job.contactEmail !== userId) {
      throw new ForbiddenException(
        'Only the job owner can update this setting',
      );
    }

    // Use the correct JobStatus enum values
    // You'll need to import and use the correct JobStatus enum
    job.status = isAccepting ? ('active' as any) : ('inactive' as any);
    return this.jobRepository.save(job);
  }

  async toggleSaveJob(
    jobId: string,
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
      'company',
      'location',
      'salaryMin',
      'salaryMax',
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

    // Fixed: Use safePage and safeLimit instead of potentially undefined values
    return new PaginatedJobResponseDto(jobs, total, safePage, safeLimit);
  }

  async getSingleJobAsDto(id: string): Promise<JobResponseDto> {
    const job = await this.findJobById(id);
    return new JobResponseDto(job);
  }
}
