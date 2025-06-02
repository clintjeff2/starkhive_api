import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobsService } from './jobs.service';
import { Job } from './entities/job.entity';
import { Application } from './entities/application.entity'; 

@Module({
  imports: [TypeOrmModule.forFeature([Job, Application])],
  providers: [JobsService],
  exports: [JobsService],
})
export class JobsModule {}
