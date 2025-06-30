import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Patch,
  Request,
  Delete,
  ParseIntPipe,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JobsService } from './jobs.service';
import { UpdateJobStatusDto } from './dto/update-status.dto';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { Request as ExpressRequest } from 'express';
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

// Extend Express Request with user property
interface RequestWithUser extends ExpressRequest {
  user?: {
    id: string;
  };
}

// @Controller('jobs')
// export class JobsController {
//   constructor(private readonly jobsService: JobsService) {}
@ApiTags('jobs')
@Controller('jobs')
export class JobsController {
  constructor(
    private readonly jobsService: JobsService,
    private readonly blockchainService: BlockchainService,
  ) {}

  //   @Post()
  //   create(@Body() createJobDto: CreateJobDto) {
  //     return this.jobsService.createJob(createJobDto);
  //   }

  //   @Get()
  //   findAll() {
  //     return this.jobsService.findAllJobs();
  //   }

  @Get('saved')
  async getSavedJobs(@GetUser() user: User) {
    return this.jobsService.getSavedJobs(user.id);
  }

  @Get(':id')
  async getById(@Param('id') id: number) {
    return this.jobsService.findJobById(id);
  }

  @Get(':id/saved')
  async isJobSaved(@Param('id') id: number, @GetUser() user: User) {
    return this.jobsService.isJobSaved(id, user.id);
  }

  @Patch(':id')
  async updateJob(
    @Param('id') id: number,
    @Body() updateJobDto: UpdateJobDto,
    @GetUser() user: User,
  ) {
    return this.jobsService.updateJob(id, updateJobDto, user.id);
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: number,
    @Body() updateStatusDto: UpdateJobStatusDto,
    @GetUser() user: User,
  ) {
    return this.jobsService.updateJobStatus(id, updateStatusDto, user.id);
  }

  @Patch(':id/toggle-applications')
  async toggleAcceptingApplications(
    @Param('id') id: number,
    @Body('isAcceptingApplications') isAcceptingApplications: boolean,
    @GetUser() user: User,
  ) {
    return this.jobsService.toggleAcceptingApplications(
      id,
      isAcceptingApplications,
      user.id,
    );
  }

  @Post(':id/save')
  async toggleSaveJob(@Param('id') id: number, @GetUser() user: User) {
    return this.jobsService.toggleSaveJob(id, user.id);
  }

  @Post(':id/restore')
  async restoreJob(
    @Param('id', ParseIntPipe) id: number, // Job ID is integer
    @GetUser() user: User,
  ) {
    return this.jobsService.restoreJob(id, user.id); // user.id is string UUID
  }

  @Delete(':id')
  async removeJob(
    @Param('id', ParseIntPipe) id: number, // Job ID is integer
    @GetUser() user: User,
  ) {
    return this.jobsService.removeJob(id, user.id); // user.id is string UUID
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
