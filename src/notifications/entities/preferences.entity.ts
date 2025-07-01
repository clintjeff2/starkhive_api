import { User } from '../../auth/entities/user.entity';
import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn } from 'typeorm';
import { NotificationChannel } from '../enums/notification-channel.enum';
import { NotificationFrequency } from '../enums/notification-frequency.enum';

class ChannelPreference {
  @Column({ default: true })
  inApp: boolean;

  @Column({ default: false })
  email: boolean;

  @Column({ default: false })
  sms: boolean;

  @Column({ type: 'enum', enum: NotificationFrequency, default: NotificationFrequency.IMMEDIATE })
  frequency: NotificationFrequency;
}

@Entity()
export class Preferences {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn()
  user: User;

  @Column(() => ChannelPreference)
  application: ChannelPreference;

  @Column(() => ChannelPreference)
  reviews: ChannelPreference;

  @Column(() => ChannelPreference)
  posts: ChannelPreference;

  @Column(() => ChannelPreference)
  tasks: ChannelPreference;
}