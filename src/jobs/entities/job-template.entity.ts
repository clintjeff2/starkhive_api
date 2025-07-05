import { ExperienceLevel, JobType } from 'src/job-posting/entities/job.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

@Entity('job_templates')
@Index(['category'])
@Index(['createdBy'])
@Index(['isShared'])
export class JobTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 200 })
  @Index()
  name: string;

  @Column('text', { nullable: true })
  description: string;

  @Column({ length: 200 })
  @Index()
  title: string;

  @Column('text')
  jobDescription: string;

  @Column({ length: 100 })
  company: string;

  @Column({ length: 100, nullable: true })
  location: string;

  @Column({
    type: 'enum',
    enum: JobType,
    default: JobType.FULL_TIME,
  })
  jobType: JobType;

  @Column({
    type: 'enum',
    enum: ExperienceLevel,
    default: ExperienceLevel.MID,
  })
  experienceLevel: ExperienceLevel;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  salaryMin: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  salaryMax: number;

  @Column({ length: 10, nullable: true })
  salaryCurrency: string;

  @Column('text', { array: true, default: [] })
  requirements: string[];

  @Column('text', { array: true, default: [] })
  responsibilities: string[];

  @Column('text', { array: true, default: [] })
  benefits: string[];

  @Column('text', { array: true, default: [] })
  skills: string[];

  @Column({ length: 100, nullable: true })
  contactEmail: string;

  @Column({ length: 20, nullable: true })
  contactPhone: string;

  @Column({ default: false })
  isRemote: boolean;

  // Template-specific fields
  @Column({ length: 50, nullable: true })
  category: string;

  @Column('text', { array: true, default: [] })
  tags: string[];

  @Column({ default: false })
  isShared: boolean;

  @Column({ length: 100 })
  createdBy: string; // User ID or email

  @Column({ default: 0 })
  useCount: number;

  @Column({ type: 'timestamp', nullable: true })
  lastUsedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
