import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PerformanceMetricsDto } from './dto/performance-metrics.dto';
import { Application } from '../applications/entities/application.entity';
import { Job } from '../jobs/entities/job.entity';
import { User } from './entities/user.entity';
import { JobStatus } from '../feed/enums/job-status.enum';

@Injectable()
export class PerformanceService {
  constructor(
    @InjectRepository(Application)
    private readonly applicationRepo: Repository<Application>,
    @InjectRepository(Job)
    private readonly jobRepo: Repository<Job>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

   async getFreelancerPerformance(freelancerId: string): Promise<PerformanceMetricsDto> {
    // Single query to get all applications with job relations
    const applications = await this.applicationRepo.find({
      where: { freelancerId },
      relations: ['job'],
    });

    const totalApplications = applications.length;
    const successfulApplications = applications.filter(app => app.status === JobStatus.APPROVED);
    const applicationSuccessRate = totalApplications > 0 ? successfulApplications.length / totalApplications : 0;

    // Calculate earnings from approved applications
    const totalEarnings = successfulApplications.reduce((sum, app) => sum + (app.job?.budget || 0), 0);

    // Earnings over time from approved applications
    const earningsByMonth: { [key: string]: number } = {};
    successfulApplications.forEach(app => {
      if (app.job?.createdAt) {
        const month = app.job.createdAt.toISOString().slice(0, 7);
        earningsByMonth[month] = (earningsByMonth[month] || 0) + (app.job.budget || 0);
      }
    });
    const earningsOverTime = Object.keys(earningsByMonth)
      .sort()
      .map(month => earningsByMonth[month]);

    // Calculate skill demand from all applications
    const skillCount: Record<string, number> = {};
    applications.forEach(app => {
      const jobSkills = app.job?.skills;
      if (Array.isArray(jobSkills)) {
        jobSkills.forEach(skill => {
          skillCount[skill] = (skillCount[skill] || 0) + 1;
        });
      }
    });
    const topSkills = Object.entries(skillCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([skill]) => skill);

    // Profile view statistics (placeholder, as no entity found)
    const profileViews = 0;

    // Performance comparison (compare to average application success rate)
    const allApplications = await this.applicationRepo.count();
    const allSuccess = await this.applicationRepo.count({ where: { status: JobStatus.APPROVED } });
    const avgSuccessRate = allApplications > 0 ? allSuccess / allApplications : 0;
    const comparisonToAverage = avgSuccessRate > 0 ? (applicationSuccessRate - avgSuccessRate) / avgSuccessRate : 0;

    return {
      applicationSuccessRate,
      totalEarnings,
      topSkills,
      skillDemand: skillCount,
      earningsOverTime,
      profileViews,
      comparisonToAverage,
    };
  }
}
