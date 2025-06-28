import { User } from 'src/auth/entities/user.entity';
import { JobStatus } from 'src/feed/enums/job-status.enum';
import { Job } from 'src/jobs/entities/job.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Unique,
  ManyToOne,
} from 'typeorm';

@Entity('applications')
@Unique(['jobId', 'freelancerId'])
export class Application {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  jobId: number;

  @Column()
  freelancerId: string;

  @Column()
  recruiterId: string;

  @ManyToOne(() => User, (user) => user.applications)
  user: User;

  @ManyToOne(() => Job, (job) => job.applications)
  job: Job;

  @Column({ type: 'enum', enum: JobStatus, default: JobStatus.OPEN })
  status: JobStatus;

  @Column('text')
  coverLetter: string;

  @CreateDateColumn()
  createdAt: Date;
}
