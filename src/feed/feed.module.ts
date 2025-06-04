
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FeedService } from './feed.service';
import { FeedController } from './feed.controller';
import { SavedPost } from './entities/savedpost.entity';
import { Post } from '../post/entities/post.entity';
import { Job } from 'src/jobs/entities/job.entity';
import { NotificationsModule } from 'src/notifications/notifications.module';
import { Comment } from './entities/comment.entity';

@Module({
  imports: [NotificationsModule, TypeOrmModule.forFeature([SavedPost, Post, Comment, Job])],
  controllers: [FeedController],
  providers: [FeedService],
  exports: [FeedService, TypeOrmModule],
})
export class FeedModule {}