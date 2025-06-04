import { Module } from '@nestjs/common';
import { PostService } from './post.service';
import { PostController } from './post.controller';
import { Post } from './entities/post.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Comment } from 'src/feed/entities/comment.entity';
import { SavedPost } from 'src/feed/entities/savedpost.entity';
import { FeedModule } from 'src/feed/feed.module';

@Module({
  imports: [FeedModule, TypeOrmModule.forFeature([Post, Comment, SavedPost])],
  controllers: [PostController],
  providers: [PostService],
  exports: [PostService],
})
export class PostModule {}
