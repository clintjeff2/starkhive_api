import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApplicationsService } from './applications.service';
import { ApplicationsController } from './applications.controller';
import { Application } from './entities/application.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { Notification } from 'src/notifications/entities/notification.entity';
import { Job } from 'src/jobs/entities/job.entity';
import { User } from 'src/auth/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Application, Notification, Job, User])],
  controllers: [ApplicationsController],
  providers: [ApplicationsService, NotificationsService],
  exports: [ApplicationsService],
})
export class ApplicationsModule {}
