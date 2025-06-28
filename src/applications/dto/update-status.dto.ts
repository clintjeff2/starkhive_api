
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApplicationStatus } from '../entities/application.entity';

export class UpdateStatusDto {
  @IsEnum(ApplicationStatus, { message: 'Invalid status type' })
  status: ApplicationStatus;

  @IsOptional()
  @IsString()
  updatedBy?: string; 
}
