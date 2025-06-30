// src/auth/dto/verify-skill.dto.ts
import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  IsDateString,
  IsUrl,
  Min,
  Max,
} from 'class-validator';
import { SkillCategory } from '../entities/skills-verification.entity';

export class CreateSkillVerificationDto {
  @IsString()
  skillName: string;

  @IsEnum(SkillCategory)
  category: SkillCategory;

  @IsOptional()
  @IsUrl()
  certificateUrl?: string;

  @IsOptional()
  @IsString()
  issuingOrganization?: string;

  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @IsOptional()
  @IsString()
  verificationNotes?: string;
}

export class UpdateSkillVerificationDto {
  @IsOptional()
  @IsString()
  skillName?: string;

  @IsOptional()
  @IsEnum(SkillCategory)
  category?: SkillCategory;

  @IsOptional()
  @IsUrl()
  certificateUrl?: string;

  @IsOptional()
  @IsString()
  issuingOrganization?: string;

  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @IsOptional()
  @IsString()
  verificationNotes?: string;
}

export class SkillAssessmentDto {
  @IsString()
  skillVerificationId: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  score: number;

  @IsString()
  assessmentId: string;

  @IsOptional()
  @IsString()
  assessmentNotes?: string;
}
