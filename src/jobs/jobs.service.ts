import { Injectable, NotFoundException, ForbiddenException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, IsNull, DataSource } from 'typeorm';

import { Job } from './entities/job.entity';
import { Application } from 'src/applications/entities/application.entity';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { CreateApplicationDto } from 'src/applications/dto/create-application.dto'; 
import { UpdateApplicationDto } from 'src/applications/dto/update-application.dto';
import { UpdateJobStatusDto } from './dto/update-status.dto';

import { AntiSpamService } from '../anti-spam/anti-spam.service';

@Injectable()
export class JobsService {
  constructor(
    @InjectRepository(Job)
    private readonly jobRepository: Repository<Job>,

    @InjectRepository(Application)
    private readonly applicationRepository: Repository<Application>,

    private readonly antiSpamService: AntiSpamService,
    @Inject(DataSource)
    private dataSource: DataSource,
  ) {}

  // Job CRUD with anti-spam check on create
  async createJob(createJobDto: CreateJobDto): Promise<Job> {
    const job = this.jobRepository.create(createJobDto);
    const saved = await this.jobRepository.save(job);

    const isSpam = await this.antiSpamService.analyzeJobPost(saved);
    if (isSpam) {
      saved.isFlagged = true;
      await this.jobRepository.save(saved);
    }

    return saved;
  }

  async findAllJobs(includeDeleted: boolean = false): Promise<Job[]> {
    const query = this.jobRepository.createQueryBuilder('job')
      .orderBy('job.createdAt', 'DESC');

    if (!includeDeleted) {
      query.andWhere('job.deletedAt IS NULL');
    }

    return query.getMany();
  }

  async findJobById(id: number, includeDeleted: boolean = false): Promise<Job> {
    const query = this.jobRepository.createQueryBuilder('job')
      .where('job.id = :id', { id });

    if (!includeDeleted) {
      query.andWhere('job.deletedAt IS NULL');
    }
    
    const job = await query.getOne();
    if (!job) {
      throw new NotFoundException(`Job with ID ${id} not found`);
    }
    
    return job;
  }

  async updateJob(id: number, updateJobDto: UpdateJobDto): Promise<Job> {
    const job = await this.findJobById(id);
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
      withDeleted: true
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

  // Application CRUD
  async createApplication(createApplicationDto: CreateApplicationDto): Promise<Application> {
    const application = this.applicationRepository.create(createApplicationDto);
    return this.applicationRepository.save(application);
  }

  async findAllApplications(): Promise<Application[]> {
    return this.applicationRepository.find({ order: { createdAt: 'DESC' } });
  }

  async findApplicationById(id: number): Promise<Application> {
    const application = await this.applicationRepository.findOne({ where: { id: id.toString() } });
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
  async getWeeklyNewJobsCount(includeDeleted: boolean = false): Promise<Array<{ week: string; count: number }>> {
    const query = this.jobRepository
      .createQueryBuilder('job')
      .select(`TO_CHAR(DATE_TRUNC('week', job."createdAt"), 'YYYY-MM-DD')`, 'week')
      .addSelect('COUNT(*)', 'count')
      .groupBy('1')
      .orderBy('1', 'DESC');
      
    if (!includeDeleted) {
      query.andWhere('job.deletedAt IS NULL');
    }
    
    const raw = await query.getRawMany<{ week: string; count: string }>();

    return raw.map(r => ({
      week: r.week,
      count: parseInt(r.count, 10),
    }));
  }

  // Weekly analytics for applications
  async getWeeklyNewApplicationsCount(): Promise<Array<{ week: string; count: number }>> {
    const raw = await this.applicationRepository
      .createQueryBuilder('application')
      .select(`TO_CHAR(DATE_TRUNC('week', application."createdAt"), 'YYYY-MM-DD')`, 'week')
      .addSelect('COUNT(*)', 'count')
      .groupBy(`DATE_TRUNC('week', application."createdAt")`)
      .orderBy(`DATE_TRUNC('week', application."createdAt")`, 'DESC')
      .getRawMany<{ week: string; count: string }>();

    return raw.map(r => ({
      week: r.week,
      count: parseInt(r.count, 10),
    }));
  }

  async updateJobStatus(id: number, updateStatusDto: UpdateJobStatusDto, userId: number): Promise<Job> {
    const job = await this.findJobById(id);
    
    // TODO: Add proper user ownership check once user system is implemented
    // For now, we'll just throw a placeholder error
    if (job.ownerId !== userId) {
      throw new ForbiddenException('Only the job owner can update the job status');
    }

    job.status = updateStatusDto.status;
    return this.jobRepository.save(job);
  }
}