import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { Notification } from './entities/notification.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification]),
    forwardRef(() => AuthModule), 
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService], 
})
export class NotificationsModule {}