import { Controller, Get, Query, Param, Patch, Body, ValidationPipe } from '@nestjs/common';
import { MatchingService } from '../services/matching.service';
import { GetJobRecommendationsDto, JobRecommendationResponseDto } from '../dto/job-recommendation.dto';

@Controller('matching')
export class MatchingController {
  constructor(private readonly matchingService: MatchingService) {}

  @Get('recommendations')
  async getJobRecommendations(
    @Query(ValidationPipe) query: GetJobRecommendationsDto,
  ): Promise<JobRecommendationResponseDto[]> {
    return this.matchingService.getJobRecommendations(
      query.freelancerId,
      query.limit,
      query.offset,
      query.categories,
      query.minScore,
    );
  }

  @Get('history/:freelancerId')
  async getMatchingHistory(@Param('freelancerId') freelancerId: string) {
    return this.matchingService.getMatchingHistory(freelancerId);
  }

  @Patch('action')
  async updateMatchingAction(
    @Body() body: { freelancerId: string; jobId: string; action: 'viewed' | 'applied' | 'ignored' },
  ): Promise<{ message: string }> {
    await this.matchingService.updateMatchingAction(
      body.freelancerId,
      body.jobId,
      body.action,
    );
    return { message: 'Action updated successfully' };
  }
}