import { Test, TestingModule } from '@nestjs/testing';
import { FeedController } from './feed.controller';
import { FeedService } from './feed.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SavedPost } from './entities/savedpost.entity';
import { Post } from '../post/entities/post.entity';
import { Report } from './entities/report.entity';
import { Job } from '../jobs/entities/job.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { Comment } from './entities/comment.entity';
import { Like } from './entities/like.entity';

describe('FeedController', () => {
  let controller: FeedController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FeedController],
      providers: [
        FeedService,
        {
          provide: getRepositoryToken(SavedPost),
          useValue: {},
        },
        {
          provide: getRepositoryToken(Post),
          useValue: {},
        },
        {
          provide: getRepositoryToken(Report),
          useValue: {},
        },
        {
          provide: getRepositoryToken(Job),
          useValue: {},
        },
        {
          provide: NotificationsService,
          useValue: {},
        },
        {
          provide: getRepositoryToken(Comment),
          useValue: {},
        },
        {
          provide: getRepositoryToken(Like),
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<FeedController>(FeedController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
