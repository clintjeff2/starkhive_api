import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { BackupType, BackupStatus } from '../dto/backup-config.dto';

@Entity('backups')
export class Backup {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: BackupType })
  type: BackupType;

  @Column({ type: 'enum', enum: BackupStatus, default: BackupStatus.PENDING })
  status: BackupStatus;

  @Column()
  database: string;

  @Column()
  filePath: string;

  @Column({ nullable: true })
  s3Key?: string;

  @Column({ type: 'bigint', default: 0 })
  size: number;

  @Column({ default: true })
  compression: boolean;

  @Column({ default: false })
  crossRegion: boolean;

  @Column({ nullable: true })
  checksum?: string;

  @Column({ nullable: true, type: 'text' })
  error?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  completedAt?: Date;

  @Column({ type: 'int', default: 30 })
  retentionDays: number;
}
