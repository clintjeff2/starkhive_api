import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Patch,
  Delete,
  Query,
  UseGuards,
  ParseIntPipe,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JobsService } from './jobs.service';
import { RecommendationService } from './recommendation.service';
import { UpdateJobStatusDto } from './dto/update-status.dto';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { SearchJobsDto } from './dto/search-jobs.dto';
import {
  GetRecommendationsDto,
  UpdateRecommendationActionDto,
  RecommendationMetricsDto,
} from './dto/recommendation.dto';
import { GetUser } from 'src/auth/decorators/get-user.decorator';
import { User } from 'src/auth/entities/user.entity';
import { BlockchainService } from './blockchain/blockchain.service';
import { PaymentRequestDto } from './dto/payment-request.dto';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { AuthGuardGuard } from '../auth/guards/auth.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

// Extend Express Request with user property
interface RequestWithUser extends ExpressRequest {
  user?: {
    id: string;
  };
}

@ApiTags('jobs')
@ApiBearerAuth('jwt-auth')
@Controller('jobs')
export class JobsController {
  constructor(
    private readonly jobsService: JobsService,
    private readonly blockchainService: BlockchainService,
  ) {}
    private readonly recommendationService: RecommendationService,
  ) {}

  @Post()
  @UseGuards(AuthGuardGuard)
  createJob(@Body() createJobDto: CreateJobDto, @GetUser() user: User) {
    return this.jobsService.createJob(createJobDto, user.id);
  }

  @Get()
  findAllJobs() {
    return this.jobsService.findAllJobs();
  }

  @Get('search')
  async advancedSearch(@Query() query: SearchJobsDto) {
    return this.jobsService.advancedSearchJobs(query);
  }

  @Get(':id')
  findJobById(@Param('id', ParseIntPipe) id: number) {
    return this.jobsService.findJobById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a job listing (recruiter only)' })
  @ApiResponse({ status: 200, description: 'Job updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden. Only the job owner can update this job.' })
  @ApiResponse({ status: 404, description: 'Job not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UseGuards(AuthGuardGuard)
  updateJob(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateJobDto: UpdateJobDto,
    @GetUser() user: User,
  ) {
    return this.jobsService.updateJob(id, updateJobDto, user.id);
  }

  @Patch(':id/status')
  @UseGuards(AuthGuardGuard)
  updateJobStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateStatusDto: UpdateJobStatusDto,
    @GetUser() user: User,
  ) {
    return this.jobsService.updateJobStatus(id, updateStatusDto, user.id);
  }

  @Patch(':id/toggle-applications')
  @UseGuards(AuthGuardGuard)
  toggleAcceptingApplications(
    @Param('id', ParseIntPipe) id: number,
    @Body('isAcceptingApplications') isAcceptingApplications: boolean,
    @GetUser() user: User,
  ) {
    return this.jobsService.toggleAcceptingApplications(
      id,
      isAcceptingApplications,
      user.id,
    );
  }

  @Delete(':id')
  @UseGuards(AuthGuardGuard)
  removeJob(
    @Param('id', ParseIntPipe) id: number,
    @GetUser() user: User,
  ) {
    return this.jobsService.removeJob(id, user.id);
  }

  @Post(':id/restore')
  @UseGuards(AuthGuardGuard)
  restoreJob(
    @Param('id', ParseIntPipe) id: number,
    @GetUser() user: User,
  ) {
    return this.jobsService.restoreJob(id, user.id);
  }

  @Post(':id/save')
  @UseGuards(AuthGuardGuard)
  toggleSaveJob(
    @Param('id', ParseIntPipe) id: number,
    @GetUser() user: User,
  ) {
    return this.jobsService.toggleSaveJob(id, user.id);
  }

  @Get(':id/saved')
  @UseGuards(AuthGuardGuard)
  isJobSaved(
    @Param('id', ParseIntPipe) id: number,
    @GetUser() user: User,
  ) {
    return this.jobsService.isJobSaved(id, user.id);
  }

  @Get('saved')
  @UseGuards(AuthGuardGuard)
  getSavedJobs(@GetUser() user: User) {
    return this.jobsService.getSavedJobs(user.id);
  }

  // Job recommendations endpoints
  @Get('recommendations')
  @UseGuards(AuthGuardGuard)
  getRecommendations(
    @Query() query: GetRecommendationsDto,
    @GetUser() user: User,
  ) {
    return this.recommendationService.generateRecommendations(
      user.id,
      query,
    );
  }

  @Get('recommendations/metrics')
  @UseGuards(AuthGuardGuard)
  getRecommendationMetrics(
    @GetUser() user: User,
  ): Promise<RecommendationMetricsDto> {
    return this.recommendationService.getRecommendationMetrics(user.id);
  }

  // @Get('saved')
  // async getSavedJobs(@Request() req: RequestWithUser) {
  //   const userId = req.user?.id || '1'; // Placeholder
  //   return this.jobsService.getSavedJobs(userId);
  // }

  // @Get(':id/saved')
  // async isJobSaved(@Param('id') id: string, @Request() req: RequestWithUser) {
  //   const userId = req.user?.id || '1'; // Placeholder
  //   return this.jobsService.isJobSaved(id, userId);
  // }

  /**
   * Initiate a payment for a job (Web3 payment)
   * POST /jobs/:id/pay
   */
  @ApiOperation({
    summary: 'Initiate a payment for a job using Starknet smart contract',
  })
  @ApiParam({ name: 'id', description: 'Job ID' })
  @ApiBody({ type: PaymentRequestDto, description: 'Payment request payload' })
  @ApiResponse({
    status: 201,
    description: 'Transaction hash returned if successful',
  })
  @Post(':id/pay')
  async payForJob(
    @Param('id') id: string,
    @Body() paymentDto: PaymentRequestDto,
    @GetUser() user: User,
  ) {
    // You may want to fetch contractAddress and abi from config or DB
    const { recipient, amount, abi, contractAddress, type } = paymentDto;
    if (!contractAddress) {
      throw new NotFoundException('contractAddress is required');
    }
    if (!user?.id) {
      throw new UnauthorizedException('User must be authenticated to make a payment');
    }
    // Validate job existence
    const job = await this.jobsService.findJobById(Number(id));
    if (!job) {
      throw new NotFoundException('Job not found');
    }
    // Example: Only the job owner (recruiter) can pay for the job
    if (job.recruiterId !== user.id) {
      throw new UnauthorizedException('You are not authorized to pay for this job');
    }
    const from = user.id;
    // Call blockchain service to make payment
    return this.blockchainService.makePayment(
      recipient,
      amount,
      abi,
      contractAddress,
      from,
      type,
    );
  }

  /**
   * Check and update the status of a transaction
   * GET /jobs/tx/:txHash/status
   */
  @ApiOperation({
    summary:
      'Check and update the status of a blockchain transaction by its hash',
  })
  @ApiParam({ name: 'txHash', description: 'Transaction hash' })
  @ApiResponse({ status: 200, description: 'Current transaction status' })
  @Get('tx/:txHash/status')
  async getTransactionStatus(@Param('txHash') txHash: string) {
    return this.blockchainService.trackTransactionStatus(txHash);
  }
}

  @Patch('recommendations/:id/action')
  @UseGuards(AuthGuardGuard)
  updateRecommendationAction(
    @Param('id') recommendationId: string,
    @Body() action: UpdateRecommendationActionDto,
    @GetUser() user: User,
  ) {
    return this.recommendationService.updateRecommendationAction(
      recommendationId,
      action,
      user.id,
    );
  }
};
