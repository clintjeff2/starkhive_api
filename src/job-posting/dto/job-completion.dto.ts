import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { CompletionStatus } from '../entities/job.entity';

export class MarkJobCompletedDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  completionNote?: string;
}

export class ReviewJobCompletionDto {
  @IsEnum(CompletionStatus)
  completionStatus: CompletionStatus.APPROVED | CompletionStatus.REJECTED;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  rejectionReason?: string;
}

export class DisputeJobCompletionDto {
  @IsString()
  @MaxLength(1000)
  disputeReason: string;
}
