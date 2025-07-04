import {
  IsUUID,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsArray,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class GetJobRecommendationsDto {
  @IsUUID()
  freelancerId: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  @Type(() => Number)
  limit?: number = 10;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  offset?: number = 0;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categories?: string[];

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  minScore?: number = 50;
}

export class JobRecommendationResponseDto {
  id: string;
  title: string;
  description: string;
  requiredSkills: string[];
  preferredSkills: string[];
  experienceLevel: string;
  budget: number;
  duration: string;
  category: string;
  clientId: string;
  matchingScore: number;
  scoreBreakdown: {
    skillsScore: number;
    experienceScore: number;
    budgetScore: number;
    categoryScore: number;
    availabilityScore: number;
  };
  createdAt: Date;
}
