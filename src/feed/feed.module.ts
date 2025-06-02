
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FeedService } from './feed.service';
import { FeedController } from './feed.controller';
import { SavedPost } from './entities/savedpost.entity';
import { Post } from '../post/entities/post.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SavedPost, Post])],
  controllers: [FeedController],
  providers: [FeedService],
  exports: [FeedService],
})
export class FeedModule {}