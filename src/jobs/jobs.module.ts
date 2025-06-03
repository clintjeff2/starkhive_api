import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeo
import { JobsService } from './jobs.service';
import { Job } from './entities/job.entity';
import { Application } from './entities/application.entity';
import { Job } from './entities/job.entity';
import { JobController } from './jobs.controller'; 
import { AntiSpamModule } from '../anti-spam/anti-spam.module';

@Module({
  imports: [TypeOrmModule.forFeature([Job,Application]), AntiSpamModule],
  providers: [JobService],
  controllers: [JobController],
})
export class JobModule {}

