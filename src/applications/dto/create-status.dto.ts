import { IsEnum, IsOptional } from 'class-validator';
import { ApplicationStatus } from '../entities/application.entity';

export class CreateStatusDto {
  @IsOptional()
  @IsEnum(ApplicationStatus, { message: 'Invalid status type' })
  status?: ApplicationStatus; // optional, defaults to submitted
}
