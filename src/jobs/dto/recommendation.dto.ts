import { IsString, IsOptional, IsNumber, IsArray, IsBoolean, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class UserPreferencesDto {
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  skills?: string[];

  @IsString()
  @IsOptional()
  experienceLevel?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsObject()
  @IsOptional()
  budgetRange?: {
    min: number;
    max: number;
  };

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  jobTypes?: string[];
}

export class GetRecommendationsDto {
  @IsNumber()
  @IsOptional()
  limit?: number = 20;

  @IsNumber()
  @IsOptional()
  offset?: number = 0;

  @IsString()
  @IsOptional()
  sortBy?: 'score' | 'createdAt' | 'popularity' = 'score';

  @IsString()
  @IsOptional()
  sortOrder?: 'asc' | 'desc' = 'desc';

  @ValidateNested()
  @Type(() => UserPreferencesDto)
  @IsOptional()
  preferences?: UserPreferencesDto;
}

export class UpdateRecommendationActionDto {
  @IsString()
  action: 'view' | 'apply' | 'save' | 'dismiss';

  @IsBoolean()
  @IsOptional()
  value?: boolean = true;
}

export class RecommendationResponseDto {
  id: string;
  jobId: number;
  score: number;
  scoringFactors: {
    skillMatch: number;
    experienceMatch: number;
    locationMatch: number;
    budgetMatch: number;
    userBehavior: number;
    jobPopularity: number;
  };
  job: {
    id: number;
    title: string;
    description: string;
    budget?: number;
    deadline?: Date;
    status: string;
    createdAt: Date;
  };
  isViewed: boolean;
  isApplied: boolean;
  isSaved: boolean;
  isDismissed: boolean;
  clickThroughRate: number;
  applicationRate: number;
  createdAt: Date;
}

export class RecommendationMetricsDto {
  totalRecommendations: number;
  averageScore: number;
  clickThroughRate: number;
  applicationRate: number;
  topSkills: Array<{ skill: string; count: number }>;
  topJobTypes: Array<{ type: string; count: number }>;
  recommendationsByScore: Array<{ scoreRange: string; count: number }>;
} 