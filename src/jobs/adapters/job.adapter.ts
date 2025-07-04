// Create this as a new file: src/jobs/adapters/job.adapter.ts

import { Job } from '../entities/job.entity';
import { JobResponseDto } from '../../job-posting/dto/job-response.dto';

export class JobAdapter {
  /**
   * Convert a single Job entity to the format expected by JobResponseDto
   */
  static toJobPostingEntity(job: Job): JobResponseDto {
    return new JobResponseDto(job);
  }

  /**
   * Convert an array of Job entities to the format expected by PaginatedJobResponseDto
   */
  static toJobPostingEntities(jobs: Job[]): JobResponseDto[] {
    return jobs.map((job) => this.toJobPostingEntity(job));
  }
}
