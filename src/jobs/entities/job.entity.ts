import { Application } from 'src/applications/entities/application.entity';
import { JobStatus } from 'src/feed/enums/job-status.enum';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';

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

  @Column({
    type: 'enum',
    enum: JobStatus,
    default: JobStatus.OPEN
  })
  status: JobStatus;

  @OneToMany(() => Application, (application) => application.job)
  applications: Application[];

  @Column()
  ownerId: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  freelancer: any;
}
 
