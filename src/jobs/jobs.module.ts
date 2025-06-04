import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobsService } from './jobs.service';
import { Job } from './entities/job.entity';
import { Application } from 'src/applications/entities/application.entity';

import { JobController } from './jobs.controller'; 
import { AntiSpamModule } from '../anti-spam/anti-spam.module';

@Module({
  imports: [TypeOrmModule.forFeature([Job,Application]), AntiSpamModule],
  providers: [JobsService],
  controllers: [JobController],
})
export class JobModule {}

