import {
  IsString,
  IsOptional,
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsEmail,
  Length,
} from 'class-validator';

export class CreateTemplateDto {
  @IsString()
  @Length(1, 200)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  @Length(1, 200)
  title: string;

  @IsString()
  jobDescription: string;

  @IsString()
  @Length(1, 100)
  company: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  location?: string;

  @IsOptional()
  @IsEnum(JobType)
  jobType?: JobType;

  @IsOptional()
  @IsEnum(ExperienceLevel)
  experienceLevel?: ExperienceLevel;

  @IsOptional()
  @IsNumber()
  salaryMin?: number;

  @IsOptional()
  @IsNumber()
  salaryMax?: number;

  @IsOptional()
  @IsString()
  @Length(1, 10)
  salaryCurrency?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requirements?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  responsibilities?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  benefits?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @IsOptional()
  @IsString()
  @Length(1, 20)
  contactPhone?: string;

  @IsOptional()
  @IsBoolean()
  isRemote?: boolean;

  @IsOptional()
  @IsString()
  @Length(1, 50)
  category?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsBoolean()
  isShared?: boolean;

  @IsString()
  createdBy: string;
}

// src/jobs/dto/update-template.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { ExperienceLevel, JobType } from 'src/job-posting/entities/job.entity';

export class UpdateTemplateDto extends PartialType(CreateTemplateDto) {}

// src/jobs/dto/create-job-from-template.dto.ts
export class CreateJobFromTemplateDto {
  @IsString()
  templateId: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  contactEmail?: string;

  @IsOptional()
  @IsString()
  contactPhone?: string;

  @IsOptional()
  applicationDeadline?: Date;

  @IsOptional()
  @IsBoolean()
  isUrgent?: boolean;

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;
}
