// Create this as a new file: src/jobs/adapters/job.adapter.ts

import { Job } from '../entities/job.entity';

export class JobAdapter {
  /**
   * Convert a single Job entity to the format expected by JobResponseDto
   */
  static toJobPostingEntity(job: Job): any {
    return {
      id: job.id,
      title: job.title,
      description: job.description,
      budget: job.budget,
      deadline: job.deadline,
      status: job.status,
      isAcceptingApplications: job.isAcceptingApplications,
      recruiterId: job.recruiterId,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      // Add any other fields you need to transform or include
    };
  }

  /**
   * Convert an array of Job entities to the format expected by PaginatedJobResponseDto
   */
  static toJobPostingEntities(jobs: Job[]): any[] {
    return jobs.map((job) => this.toJobPostingEntity(job));
  }
}
