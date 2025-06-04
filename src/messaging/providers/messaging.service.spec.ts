import { Test, TestingModule } from '@nestjs/testing';
import { MessagingService } from './messaging.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Message } from '../entities/messaging.entity';
import { User } from 'src/auth/entities/user.entity';

describe('MessagingService', () => {
  let service: MessagingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagingService,
        {
          provide: getRepositoryToken(Message),
          useValue: {},
        },
        {
          provide: getRepositoryToken(User),
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<MessagingService>(MessagingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
