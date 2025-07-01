import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Notification } from './notification.entity';
import { NotificationChannel } from '../enums/notification-channel.enum';
import { NotificationDeliveryStatus } from '../enums/notification-delivery-status.enum';
import { User } from 'src/auth/entities/user.entity';

@Entity()
export class NotificationDelivery {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Notification, { nullable: true })
  notification: Notification;

  @ManyToOne(() => User, { nullable: false })
  user: User;

  @Column({ type: 'enum', enum: NotificationChannel })
  channel: NotificationChannel;

  @Column({ type: 'enum', enum: NotificationDeliveryStatus })
  status: NotificationDeliveryStatus;

  @Column({ nullable: true })
  error: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
} 