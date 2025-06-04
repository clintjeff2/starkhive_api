import { Test, TestingModule } from '@nestjs/testing';
import { MessagingController } from './messaging.controller';
import { MessagingService } from '../messaging.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Message } from '../entities/message.entity';

describe('MessagingController', () => {
  let controller: MessagingController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MessagingController],
      providers: [
        {
          provide: MessagingService,
          useValue: {
            sendMessage: jest.fn(),
            getMessages: jest.fn(),
            findAll: jest.fn(),
            findUserMessages: jest.fn(),
            findOne: jest.fn(),
            markAsRead: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Message),
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<MessagingController>(MessagingController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
