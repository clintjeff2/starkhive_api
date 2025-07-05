import { ApiProperty } from '@nestjs/swagger';

export class DashboardStatsDto {
  @ApiProperty({
    description: 'Total number of users',
    example: 150,
  })
  totalUsers: number;

  @ApiProperty({
    description: 'Total number of posts',
    example: 450,
  })
  totalPosts: number;

  @ApiProperty({
    description: 'Total number of jobs',
    example: 120,
  })
  totalJobs: number;

  @ApiProperty({
    description: 'Total number of reports',
    example: 23,
  })
  totalReports: number;

  @ApiProperty({
    description: 'Timestamp of when the statistics were generated',
    example: '2023-06-08T16:20:00.000Z',
  })
  timestamp: Date;
}
