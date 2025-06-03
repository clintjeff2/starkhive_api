import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Job } from './entities/job.entity';
import { Application } from './entities/application.entity';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationDto } from './dto/update-application.dto';

import { AntiSpamService } from '../anti-spam/anti-spam.service';

@Injectable()
export class JobsService {
  constructor(
    @InjectRepository(Job)
    private readonly jobRepository: Repository<Job>,

    @InjectRepository(Application)
    private readonly applicationRepository: Repository<Application>,

    private readonly antiSpamService: AntiSpamService,
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

  async findAllJobs(): Promise<Job[]> {
    return this.jobRepository.find({ order: { createdAt: 'DESC' } });
  }

  async findJobById(id: number): Promise<Job> {
    const job = await this.jobRepository.findOne({ where: { id } });
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

  async removeJob(id: number): Promise<{ message: string }> {
    const result = await this.jobRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Job with ID ${id} not found`);
    }
    return { message: 'Job removed successfully' };
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
    const application = await this.applicationRepository.findOne({ where: { id } });
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
  async getWeeklyNewJobsCount(): Promise<Array<{ week: string; count: number }>> {
    const raw = await this.jobRepository
      .createQueryBuilder('job')
      .select(`TO_CHAR(DATE_TRUNC('week', job."createdAt"), 'YYYY-MM-DD')`, 'week')
      .addSelect('COUNT(*)', 'count')
      .groupBy(`DATE_TRUNC('week', job."createdAt")`)
      .orderBy(`DATE_TRUNC('week', job."createdAt")`, 'DESC')
      .getRawMany<{ week: string; count: string }>();

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
}
