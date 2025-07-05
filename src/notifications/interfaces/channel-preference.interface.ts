import { NotificationFrequency } from '../enums/notification-frequency.enum';

export interface ChannelPreference {
  inApp: boolean;
  email: boolean;
  sms: boolean;
  frequency: NotificationFrequency;
}
