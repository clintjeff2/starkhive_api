import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Notification } from '../src/notifications/entities/notification.entity';
import { NotificationDelivery } from '../src/notifications/entities/notification-delivery.entity';
import { Preferences } from '../src/notifications/entities/preferences.entity';
import { MailService } from '../src/mail/mail.service';
import { SmsService } from '../src/notifications/services/sms.service';
import { User } from '../src/auth/entities/user.entity';

const mockMailService = {
  sendEmail: jest.fn().mockResolvedValue(true),
};
const mockSmsService = {
  sendSms: jest.fn().mockResolvedValue(true),
};

describe('Notifications E2E', () => {
  let app: INestApplication;
  let notificationRepo;
  let deliveryRepo;
  let preferencesRepo;
  let userRepo;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(MailService)
      .useValue(mockMailService)
      .overrideProvider(SmsService)
      .useValue(mockSmsService)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    notificationRepo = app.get(getRepositoryToken(Notification));
    deliveryRepo = app.get(getRepositoryToken(NotificationDelivery));
    preferencesRepo = app.get(getRepositoryToken(Preferences));
    userRepo = app.get(getRepositoryToken(User));
  });

  afterAll(async () => {
    await app.close();
  });

  it('should deliver job status notifications via all channels and track delivery', async () => {
    // Create a test user
    const user = userRepo.create({
      email: 'e2euser@example.com',
      password: 'password',
      phone: '+1234567890',
      isEmailVerified: true,
    });
    await userRepo.save(user);

    // Set preferences for all channels
    const preferences = preferencesRepo.create({
      user,
      application: {
        inApp: true,
        email: true,
        sms: true,
        frequency: 'IMMEDIATE',
      },
      reviews: {
        inApp: true,
        email: false,
        sms: false,
        frequency: 'IMMEDIATE',
      },
      posts: { inApp: true, email: false, sms: false, frequency: 'IMMEDIATE' },
      tasks: { inApp: true, email: false, sms: false, frequency: 'IMMEDIATE' },
    });
    await preferencesRepo.save(preferences);

    // Simulate job status update notification
    await request(app.getHttpServer())
      .post('/notifications/job-status')
      .send({
        userId: user.id,
        jobTitle: 'E2E Test Job',
        status: 'approved',
      })
      .expect(201);

    // Check that notifications and deliveries were created
    const notifications = await notificationRepo.find({
      where: { userId: user.id },
    });
    expect(notifications.length).toBeGreaterThan(0);
    const deliveries = await deliveryRepo.find({
      where: { user: { id: user.id } },
    });
    expect(deliveries.length).toBeGreaterThanOrEqual(2); // in-app, email, sms
    expect(deliveries.some((d) => d.channel === 'EMAIL')).toBe(true);
    expect(deliveries.some((d) => d.channel === 'SMS')).toBe(true);
    expect(deliveries.some((d) => d.channel === 'IN_APP')).toBe(true);
  });
});
