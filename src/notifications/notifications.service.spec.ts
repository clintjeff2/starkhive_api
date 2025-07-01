import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Notification } from './entities/notification.entity';
import { NotificationDelivery } from './entities/notification-delivery.entity';
import { Preferences } from './entities/preferences.entity';
import { MailService } from '../mail/mail.service';
import { SmsService } from './services/sms.service';
import { User } from '../auth/entities/user.entity';
import { Repository } from 'typeorm';

const mockNotificationRepo = () => ({
  create: jest.fn(),
  save: jest.fn(),
});
const mockDeliveryRepo = () => ({
  create: jest.fn(),
  save: jest.fn(),
});
const mockPreferencesRepo = () => ({
  findOne: jest.fn(),
});
const mockMailService = () => ({
  sendEmail: jest.fn(),
});
const mockSmsService = () => ({
  sendSms: jest.fn(),
});

describe('NotificationsService', () => {
  let service: NotificationsService;
  let notificationRepo: Repository<Notification>;
  let deliveryRepo: Repository<NotificationDelivery>;
  let preferencesRepo: Repository<Preferences>;
  let mailService: MailService;
  let smsService: SmsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: getRepositoryToken(Notification), useFactory: mockNotificationRepo },
        { provide: getRepositoryToken(NotificationDelivery), useFactory: mockDeliveryRepo },
        { provide: getRepositoryToken(Preferences), useFactory: mockPreferencesRepo },
        { provide: MailService, useFactory: mockMailService },
        { provide: SmsService, useFactory: mockSmsService },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    notificationRepo = module.get(getRepositoryToken(Notification));
    deliveryRepo = module.get(getRepositoryToken(NotificationDelivery));
    preferencesRepo = module.get(getRepositoryToken(Preferences));
    mailService = module.get<MailService>(MailService);
    smsService = module.get<SmsService>(SmsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should send in-app, email, and SMS notifications based on preferences', async () => {
    const user = { id: 'user1', email: 'test@example.com', phone: '+1234567890' } as User;
    const preferences = {
      application: { inApp: true, email: true, sms: true, frequency: 'IMMEDIATE' },
    } as Preferences;
    const notification = { id: 'notif1' } as Notification;
    preferencesRepo.findOne = jest.fn().mockResolvedValue(preferences);
    notificationRepo.create = jest.fn().mockReturnValue(notification);
    notificationRepo.save = jest.fn().mockResolvedValue(notification);
    deliveryRepo.create = ((data: any) => data) as any;
    deliveryRepo.save = jest.fn();
    mailService.sendEmail = jest.fn().mockResolvedValue(true);
    smsService.sendSms = jest.fn().mockResolvedValue(true);

    await service.sendJobStatusNotification(user, 'Test Job', 'approved');

    expect(notificationRepo.create).toHaveBeenCalled();
    expect(notificationRepo.save).toHaveBeenCalled();
    expect(deliveryRepo.save).toHaveBeenCalledTimes(3); // in-app, email, sms
    expect(mailService.sendEmail).toHaveBeenCalled();
    expect(smsService.sendSms).toHaveBeenCalled();
  });

  it('should respect preferences and only send enabled channels', async () => {
    const user = { id: 'user2', email: 'test2@example.com', phone: '+1234567890' } as User;
    const preferences = {
      application: { inApp: false, email: true, sms: false, frequency: 'IMMEDIATE' },
    } as Preferences;
    const notification = { id: 'notif2' } as Notification;
    preferencesRepo.findOne = jest.fn().mockResolvedValue(preferences);
    notificationRepo.create = jest.fn().mockReturnValue(notification);
    notificationRepo.save = jest.fn().mockResolvedValue(notification);
    deliveryRepo.create = ((data: any) => data) as any;
    deliveryRepo.save = jest.fn();
    mailService.sendEmail = jest.fn().mockResolvedValue(true);
    smsService.sendSms = jest.fn().mockResolvedValue(true);

    await service.sendJobStatusNotification(user, 'Test Job', 'approved');

    expect(deliveryRepo.save).toHaveBeenCalledTimes(1); // only email
    expect(mailService.sendEmail).toHaveBeenCalled();
    expect(smsService.sendSms).not.toHaveBeenCalled();
  });
}); 