import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { JobsService } from './jobs.service';
import { Application } from 'src/applications/entities/application.entity';
import { AntiSpamModule } from '../anti-spam/anti-spam.module';
import { JobsController } from './jobs.controller';
import { FeedModule } from 'src/feed/feed.module';
import { Job } from './entities/job.entity';
import { SavedJob } from './entities/saved-job.entity';
import { ExcludeSoftDeleteInterceptor } from 'src/common/interceptors/exclude-soft-delete.interceptor';
import { JobTemplate } from './entities/job-template.entity';

@Module({
  imports: [
    FeedModule,
    TypeOrmModule.forFeature([Job, Application, SavedJob, JobTemplate]),
    AntiSpamModule,
  ],
  providers: [
    JobsService,
    {
      provide: APP_INTERCEPTOR,
      useClass: ExcludeSoftDeleteInterceptor,
    },
  ],

  controllers: [JobsController],
  exports: [JobsService],
})
export class JobModule {}
