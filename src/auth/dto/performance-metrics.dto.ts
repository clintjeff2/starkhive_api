import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsArray, IsOptional, Min, Max } from 'class-validator';

 export class PerformanceMetricsDto {
  @ApiProperty({ description: 'Application success rate as decimal (0-1)', example: 0.75 })
  @IsNumber()
  @Min(0)
  @Max(1)
   applicationSuccessRate: number;

  @ApiProperty({ description: 'Total earnings in dollars', example: 15000 })
  @IsNumber()
  @Min(0)
   totalEarnings: number;

  @ApiProperty({ description: 'Top 5 most applied-to skills', example: ['JavaScript', 'React', 'Node.js'] })
  @IsArray()
   topSkills: string[];

  @ApiProperty({ description: 'Skill demand mapping', example: { 'JavaScript': 10, 'React': 8 } })
   skillDemand: Record<string, number>;

  @ApiProperty({ description: 'Monthly earnings over time', example: [1000, 2500, 1800] })
  @IsArray()
   earningsOverTime: number[];

  @ApiProperty({ description: 'Total profile views', example: 245 })
  @IsNumber()
  @Min(0)
   profileViews: number;

  @ApiProperty({ description: 'Performance comparison to average (-1 to 1)', example: 0.25, required: false })
  @IsOptional()
  @IsNumber()
   comparisonToAverage?: number;
 }