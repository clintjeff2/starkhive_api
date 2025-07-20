// import { Application } from 'src/applications/entities/application.entity';
// import { User } from 'src/auth/entities/user.entity';
// import { JobStatus } from 'src/feed/enums/job-status.enum';

// import {
//   Entity,
//   PrimaryGeneratedColumn,
//   Column,
//   CreateDateColumn,
//   UpdateDateColumn,
//   OneToMany,
//   JoinColumn,
//   ManyToOne,
//   DeleteDateColumn,
// } from 'typeorm';
// import { Exclude } from 'class-transformer';
// import { ExcludeFromQuery } from '../../common/decorators/exclude-from-query.decorator';
// import { Team } from '../../auth/entities/team.entity';

// @Entity()
// export class Job {
//   @PrimaryGeneratedColumn()
//   id: number;

//   @Column()
//   title: string;

//   @Column('text')
//   description: string;

//   @Column({ default: false })
//   isFlagged: boolean;

//   @Column({ type: 'json', nullable: true })
//   skills?: string[];

//   @Column('decimal', { nullable: true })
//   budget?: number;

//   @Column({ type: 'timestamp', nullable: true })
//   deadline?: Date;

//   @Column({ default: true })
//   isAcceptingApplications: boolean;

//   @Column({
//     type: 'enum',
//     enum: JobStatus,
//     default: JobStatus.OPEN,
//   })
//   status: JobStatus;

//   @OneToMany(() => Application, (application) => application.job)
//   applications: Application[];

//   @Column()
//   ownerId: string;

//   @ManyToOne(() => User, (user) => user.jobs, { eager: false })
//   @JoinColumn({ name: 'recruiterId' })
//   recruiter: User;

//   @Column()
//   recruiterId: string;

//   @CreateDateColumn()
//   createdAt: Date;

//   @UpdateDateColumn()
//   updatedAt: Date;

//   @Column({ nullable: true })
//   freelancer: any;

//   @ManyToOne(() => Team, { nullable: true, eager: false })
//   @JoinColumn({ name: 'teamId' })
//   team?: Team;

//   @Column({ nullable: true })
//   teamId?: string;

//   @Column({ default: false })
//   requiresApproval: boolean;

//   @Column({ default: false })
//   isApproved: boolean;

//   @Column({ nullable: true })
//   approvedById?: string;

//   @Column({ nullable: true })
//   approvedAt?: Date;

//   @Column({ type: 'json', nullable: true })
//   teamSettings?: {
//     sharedWithTeam: boolean;
//     allowTeamEditing: boolean;
//     notifyTeamOnApplication: boolean;
//   };

//   @DeleteDateColumn({ name: 'deleted_at' })
//   @Exclude()
//   @ExcludeFromQuery()
//   deletedAt?: Date;
// }
import { Application } from 'src/applications/entities/application.entity';
import { User } from 'src/auth/entities/user.entity';
import { Team } from 'src/auth/entities/team.entity';
import { JobStatus } from 'src/feed/enums/job-status.enum';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  JoinColumn,
  ManyToOne,
  DeleteDateColumn,
  Index,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { ExcludeFromQuery } from '../../common/decorators/exclude-from-query.decorator';

export enum JobType {
  FULL_TIME = 'full_time',
  PART_TIME = 'part_time',
  CONTRACT = 'contract',
  INTERNSHIP = 'internship',
  FREELANCE = 'freelance',
}

export enum CompletionStatus {
  NOT_SUBMITTED = 'not_submitted',
  PENDING_REVIEW = 'pending_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  AUTO_RELEASED = 'auto_released',
  DISPUTED = 'disputed',
}

export enum ExperienceLevel {
  ENTRY = 'entry',
  JUNIOR = 'junior',
  MID = 'mid',
  SENIOR = 'senior',
  LEAD = 'lead',
  EXECUTIVE = 'executive',
}

export interface TeamSettings {
  sharedWithTeam: boolean;
  allowTeamEditing: boolean;
  notifyTeamOnApplication: boolean;
}

@Entity('jobs')
@Index(['status', 'createdAt'])
@Index(['location'])
@Index(['jobType'])
@Index(['recruiterId'])
export class Job {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 200 })
  @Index()
  title: string;

  @Column('text')
  description: string;

  @Column({ length: 100, nullable: true })
  @Index()
  company?: string;

  @Column({ length: 100, nullable: true })
  location?: string;

  @Column({
    type: 'enum',
    enum: JobType,
    default: JobType.FULL_TIME,
  })
  jobType: JobType;

  @Column({
    type: 'enum',
    enum: JobStatus,
    default: JobStatus.OPEN,
  })
  status: JobStatus;

  @Column({
    type: 'enum',
    enum: ExperienceLevel,
    default: ExperienceLevel.MID,
  })
  experienceLevel: ExperienceLevel;

  // Salary information
  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  salaryMin?: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  salaryMax?: number;

  @Column({ length: 10, nullable: true })
  salaryCurrency?: string;

  // Budget for freelance/contract work
  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  budget?: number;

  @Column({ type: 'timestamp', nullable: true })
  deadline?: Date;

  // Job details arrays
  @Column('text', { array: true, default: [] })
  requirements: string[];

  @Column('text', { array: true, default: [] })
  responsibilities: string[];

  @Column('text', { array: true, default: [] })
  benefits: string[];

  @Column('text', { array: true, default: [] })
  skills: string[];

  // Contact information
  @Column({ length: 100, nullable: true })
  contactEmail?: string;

  @Column({ length: 20, nullable: true })
  contactPhone?: string;

  @Column({ type: 'date', nullable: true })
  applicationDeadline?: Date;

  // Job flags and settings
  @Column({ default: false })
  isRemote: boolean;

  @Column({ default: false })
  isUrgent: boolean;

  @Column({ default: false })
  isFeatured: boolean;

  @Column({ default: false })
  isFlagged: boolean;

  @Column({ default: true })
  isAcceptingApplications: boolean;

  // Analytics
  @Column({ default: 0 })
  viewCount: number;

  @Column({ default: 0 })
  applicationCount: number;

  // Completion tracking
  @Column({
    type: 'enum',
    enum: CompletionStatus,
    default: CompletionStatus.NOT_SUBMITTED,
  })
  completionStatus: CompletionStatus;

  @Column({ nullable: true })
  completionNote?: string;

  @Column({ type: 'timestamp', nullable: true })
  completedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  reviewDeadline?: Date;

  @Column({ nullable: true })
  rejectionReason?: string;

  @Column({ default: false })
  paymentReleased: boolean;

  @Column({ type: 'timestamp', nullable: true })
  paymentReleasedAt?: Date;

  // Relationships
  @OneToMany(() => Application, (application) => application.job)
  applications: Application[];

  @ManyToOne(() => User, (user) => user.jobs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ nullable: true })
  userId: number;

  @Column()
  ownerId: string;

  @ManyToOne(() => User, (user) => user.jobs, { eager: false })
  @JoinColumn({ name: 'recruiterId' })
  recruiter: User;

  @Column()
  recruiterId: string;

  @Column({ nullable: true })
  freelancer: any;

  // Team functionality
  @ManyToOne(() => Team, { nullable: true, eager: false })
  @JoinColumn({ name: 'teamId' })
  team?: Team;

  @Column({ nullable: true })
  teamId?: string;

  @Column({ default: false })
  requiresApproval: boolean;

  @Column({ default: false })
  isApproved: boolean;

  @Column({ nullable: true })
  approvedById?: string;

  @Column({ nullable: true })
  approvedAt?: Date;

  @Column({ type: 'json', nullable: true })
  teamSettings?: TeamSettings;

  // Timestamps
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  @Exclude()
  @ExcludeFromQuery()
  deletedAt?: Date;

  @Column({ type: 'varchar', length: 20, nullable: true })
  currency?: string;
  employer: any;
}
