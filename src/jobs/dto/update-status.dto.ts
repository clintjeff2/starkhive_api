import { IsEnum } from 'class-validator';

export enum JobStatus {
  OPEN = 'open',
  CLOSED = 'closed',
}

export class UpdateJobStatusDto {
  @IsEnum(JobStatus)
  status: JobStatus;
} 