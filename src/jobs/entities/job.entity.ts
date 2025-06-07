import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';
import { JobStatus } from '../dto/update-status.dto';

@Entity()
export class Job {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column('text')
  description: string;

  @Column({ default: false })
  isFlagged: boolean;

  @Column({ default: true })
  isAcceptingApplications: boolean;

  @Column({
    type: 'enum',
    enum: JobStatus,
    default: JobStatus.OPEN
  })
  status: JobStatus;

  @Column()
  ownerId: number;

  @CreateDateColumn()
  createdAt: Date;
  freelancer: any;
}
 
