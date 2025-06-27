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
    // Application success rate
    const totalApplications = await this.applicationRepo.count({ where: { freelancerId } });
    // Use JobStatus enum for status
    const successfulApplications = await this.applicationRepo.count({ where: { freelancerId, status: JobStatus.APPROVED } });
    const applicationSuccessRate = totalApplications > 0 ? successfulApplications / totalApplications : 0;

    // Earnings tracking (sum budgets of jobs where freelancer was hired)
    const jobs = await this.jobRepo.find({ where: { freelancer: freelancerId } });
    const totalEarnings = jobs.reduce((sum, job) => sum + (job.budget || 0), 0);
    // Earnings over time (by month)
    const earningsOverTime: number[] = [];
    const earningsByMonth: { [key: string]: number } = {};
    jobs.forEach(job => {
      if (job.createdAt) {
        const month = job.createdAt.toISOString().slice(0, 7); // YYYY-MM
        earningsByMonth[month] = (earningsByMonth[month] || 0) + (job.budget || 0);
      }
    });
    Object.keys(earningsByMonth).sort().forEach(month => earningsOverTime.push(earningsByMonth[month]));

    // Skill demand analysis (top skills in jobs applied to)
    const applications = await this.applicationRepo.find({ where: { freelancerId }, relations: ['job'] });
    const skillCount: Record<string, number> = {};
    applications.forEach(app => {
      const jobSkills = app.job && app.job['skills'];
      if (jobSkills && Array.isArray(jobSkills)) {
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
