import { IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ExtendJobDto {
  @IsDateString()
  @IsNotEmpty()
  newDeadline: string;

  @IsOptional()
  @IsString()
  reason?: string;
}